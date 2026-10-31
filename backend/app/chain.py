"""Hash-only blockchain anchoring. The report stays in Firebase; only its SHA-256
fingerprint goes to the ReportRegistry contract. Verifying recomputes the hash from
the stored data and checks that the chain knows it."""
import hashlib
import json
import os
import time
from pathlib import Path

DEPLOYMENT = Path(__file__).resolve().parents[2] / "blockchain" / "deployment.json"

# Hardhat's own public test key (account #0). Safe only for the local node: never use it with real funds.
HARDHAT_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

ABI = [
    {"type": "function", "name": "anchor", "stateMutability": "nonpayable",
     "inputs": [{"name": "reportHash", "type": "bytes32"}], "outputs": []},
    {"type": "function", "name": "verify", "stateMutability": "view",
     "inputs": [{"name": "reportHash", "type": "bytes32"}],
     "outputs": [{"name": "exists", "type": "bool"},
                 {"name": "timestamp", "type": "uint64"},
                 {"name": "blockNumber", "type": "uint64"}]},
]


class ChainError(RuntimeError):
    """Subclass of RuntimeError so main.py's handler turns it into a readable 503."""


def _hex(b) -> str:
    h = b.hex()
    return h if h.startswith("0x") else "0x" + h


def report_hash(s) -> str:
    """SHA-256 of a canonical JSON form of the session's report and the answers behind it."""
    payload = {
        "session_id": s.id,
        "uid": s.uid,
        "report": s.report,
        "turns": [
            {k: t.get(k) for k in ("type", "topic", "question", "answer", "is_followup", "evaluation")}
            for t in s.turns
        ],
    }
    blob = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    return "0x" + hashlib.sha256(blob).hexdigest()


def _rpc() -> str:
    return os.getenv("INTERVIA_CHAIN_RPC", "http://127.0.0.1:8545")


def _key() -> str:
    key = os.getenv("INTERVIA_CHAIN_KEY")
    if key:
        return key
    if "127.0.0.1" in _rpc() or "localhost" in _rpc():
        return HARDHAT_KEY
    raise ChainError("INTERVIA_CHAIN_KEY is not set for this blockchain network")


def _address() -> str:
    addr = os.getenv("INTERVIA_CONTRACT")
    if not addr and DEPLOYMENT.exists():
        addr = json.loads(DEPLOYMENT.read_text()).get("address")
    if not addr:
        raise ChainError("No contract address found. Deploy it first: cd blockchain && npm run deploy")
    return addr


def _connect():
    try:
        from web3 import Web3
    except ImportError as e:
        raise ChainError("web3 is not installed. Run: pip install -r requirements.txt") from e
    w3 = Web3(Web3.HTTPProvider(_rpc(), request_kwargs={"timeout": 10}))
    try:
        online = w3.is_connected()
    except Exception:
        online = False
    if not online:
        raise ChainError(f"Cannot reach the blockchain node at {_rpc()}. Start it with: cd blockchain && npm run node")
    addr = Web3.to_checksum_address(_address())
    if not w3.eth.get_code(addr):
        raise ChainError("Contract not found on this chain (the local node was restarted?). "
                         "Redeploy it: cd blockchain && npm run deploy")
    return w3, w3.eth.contract(address=addr, abi=ABI)


def anchor(h: str) -> dict:
    """Write the hash to the chain and return what we keep on the session."""
    w3, contract = _connect()
    try:
        acct = w3.eth.account.from_key(_key())
        tx = contract.functions.anchor(bytes.fromhex(h[2:])).build_transaction({
            "from": acct.address,
            "nonce": w3.eth.get_transaction_count(acct.address, "pending"),
            "chainId": w3.eth.chain_id,
        })
        signed = acct.sign_transaction(tx)
        raw = getattr(signed, "raw_transaction", None) or signed.rawTransaction  # web3 v7 / v6
        tx_hash = w3.eth.send_raw_transaction(raw)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=30)
    except ChainError:
        raise
    except Exception as e:
        raise ChainError(f"Blockchain transaction failed: {e}") from e
    if receipt["status"] != 1:
        raise ChainError("The contract rejected the transaction (duplicate hash, or wrong wallet).")
    return {
        "hash": h,
        "tx": _hex(tx_hash),
        "block": int(receipt["blockNumber"]),
        "block_hash": _hex(receipt["blockHash"]),
        "chain_id": int(w3.eth.chain_id),
        "contract": contract.address,
        "anchored_at": time.time(),
    }


def lookup(h: str) -> dict:
    """Ask the chain whether it knows this hash."""
    _, contract = _connect()
    try:
        exists, timestamp, block = contract.functions.verify(bytes.fromhex(h[2:])).call()
    except Exception as e:
        raise ChainError(f"Blockchain lookup failed: {e}") from e
    return {"exists": bool(exists), "timestamp": int(timestamp), "block": int(block)}


def anchor_block_intact(a: dict) -> bool:
    """False if the block we anchored in no longer exists with the same hash,
    which means the local demo chain was reset (not that the report was tampered with)."""
    w3, _ = _connect()
    try:
        return _hex(w3.eth.get_block(a["block"])["hash"]) == a.get("block_hash")
    except Exception:
        return False