const { expect } = require("chai");
const { ethers } = require("hardhat");

const H = "0x" + "ab".repeat(32);

async function setup() {
  const [owner, other] = await ethers.getSigners();
  const reg = await ethers.deployContract("ReportRegistry");
  await reg.waitForDeployment();
  return { reg, owner, other };
}

describe("ReportRegistry", () => {
  it("anchors a hash and verifies it", async () => {
    const { reg } = await setup();
    await reg.anchor(H);
    const [exists, timestamp, blockNumber] = await reg.verify(H);
    expect(exists).to.equal(true);
    expect(Number(timestamp)).to.be.greaterThan(0);
    expect(Number(blockNumber)).to.be.greaterThan(0);
  });

  it("reports an unknown hash as not found", async () => {
    const { reg } = await setup();
    const [exists] = await reg.verify(H);
    expect(exists).to.equal(false);
  });

  it("rejects a duplicate hash", async () => {
    const { reg } = await setup();
    await reg.anchor(H);
    await expect(reg.anchor(H)).to.be.revertedWithCustomError(reg, "AlreadyAnchored");
  });

  it("rejects anyone except the owner", async () => {
    const { reg, other } = await setup();
    await expect(reg.connect(other).anchor(H)).to.be.revertedWithCustomError(reg, "NotOwner");
  });
});