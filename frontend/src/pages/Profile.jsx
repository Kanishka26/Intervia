import { useEffect, useState } from "react";
import { getInsights, getProfile, saveProfile } from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import ActivityHeatmap from "../components/ActivityHeatmap.jsx";

const inputCls = "mt-1 w-full rounded-md border border-line bg-surface px-3 py-2 text-base";

function Field({ id, label, value, onChange, ...rest }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">{label}</label>
      <input id={id} value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} {...rest} />
    </div>
  );
}

function Detail({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted">{label}</dt>
      <dd className="break-words">{value}</dd>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-line p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export default function Profile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [activity, setActivity] = useState([]);
  const [stats, setStats] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    Promise.all([getProfile(), getInsights()])
      .then(([p, i]) => {
        if (cancelled) return;
        setProfile(p.profile);
        setActivity(p.activity);
        setStats(i);
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  function startEdit() {
    setError("");
    setForm({
      name: "",
      bio: "",
      country: "",
      college: "",
      degree: "",
      target_role: "",
      github: "",
      linkedin: "",
      ...profile,
      grad_year: profile.grad_year ?? "",
      skills: (profile.skills || []).join(", "),
    });
    setEditing(true);
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { profile: saved } = await saveProfile({
        ...form,
        grad_year: form.grad_year ? Number(form.grad_year) : null,
        skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
      });
      setProfile(saved);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!profile && !error) return <p role="status" className="text-muted">Loading…</p>;
  if (!profile) return <p role="alert" className="text-danger">{error}</p>;

  if (editing) {
    return (
      <form onSubmit={save} className="max-w-xl space-y-4">
        <h1 className="text-3xl font-semibold leading-tight">Edit profile</h1>
        <Field id="name" label="Name" value={form.name} onChange={set("name")} maxLength={60} />
        <div>
          <label htmlFor="bio" className="block text-sm font-medium">About you</label>
          <textarea
            id="bio"
            rows={3}
            maxLength={300}
            value={form.bio}
            onChange={(e) => set("bio")(e.target.value)}
            className={inputCls}
          />
        </div>
        <Field id="country" label="Country" value={form.country} onChange={set("country")} maxLength={60} />
        <Field id="college" label="College / University" value={form.college} onChange={set("college")} maxLength={100} />
        <Field id="degree" label="Degree and field" value={form.degree} onChange={set("degree")} maxLength={100} />
        <Field id="year" label="Graduation year" type="number" min={1990} max={2040} value={form.grad_year} onChange={set("grad_year")} />
        <Field id="role" label="Target role" value={form.target_role} onChange={set("target_role")} maxLength={80} />
        <Field id="skills" label="Skills (comma separated)" value={form.skills} onChange={set("skills")} />
        <Field id="github" label="GitHub URL" placeholder="https://github.com/you" value={form.github} onChange={set("github")} />
        <Field id="linkedin" label="LinkedIn URL" placeholder="https://linkedin.com/in/you" value={form.linkedin} onChange={set("linkedin")} />
        {error && (
          <p role="alert" className="rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-danger">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-teal px-5 py-2.5 font-medium text-white hover:bg-teal-dark disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-md border border-line bg-surface px-5 py-2.5 font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  const name = profile.name || user?.displayName || user?.email || "Your name";

  return (
    <div className="grid gap-8 md:grid-cols-[16rem_1fr]">
      <aside className="space-y-5">
        {user?.photoURL ? (
          <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="h-20 w-20 rounded-full" />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-20 w-20 items-center justify-center rounded-full bg-soft text-3xl font-semibold text-teal"
          >
            {name[0].toUpperCase()}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-semibold leading-tight">{name}</h1>
          {user?.email && <p className="break-all text-sm text-muted">{user.email}</p>}
          {profile.bio && <p className="mt-2 text-sm">{profile.bio}</p>}
        </div>
        <button
          onClick={startEdit}
          className="w-full rounded-md bg-teal px-4 py-2 font-medium text-white hover:bg-teal-dark"
        >
          Edit profile
        </button>
        <dl className="space-y-3 text-sm">
          <Detail label="Country" value={profile.country} />
          <Detail label="College" value={profile.college} />
          <Detail label="Degree" value={profile.degree} />
          <Detail label="Graduation year" value={profile.grad_year} />
          <Detail label="Target role" value={profile.target_role} />
        </dl>
        {profile.skills?.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">Skills</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {profile.skills.map((s) => (
                <li key={s} className="rounded-full bg-soft px-2.5 py-0.5 text-xs text-teal">{s}</li>
              ))}
            </ul>
          </div>
        )}
        {(profile.github || profile.linkedin) && (
          <div className="flex gap-4 text-sm font-medium">
            {profile.github && (
              <a href={profile.github} target="_blank" rel="noopener noreferrer" className="text-teal underline">GitHub</a>
            )}
            {profile.linkedin && (
              <a href={profile.linkedin} target="_blank" rel="noopener noreferrer" className="text-teal underline">LinkedIn</a>
            )}
          </div>
        )}
        {!profile.country && !profile.college && !profile.degree && (
          <p className="text-sm text-muted">Add your country and education with Edit profile.</p>
        )}
      </aside>

      <section className="min-w-0 space-y-8">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Interviews" value={stats?.interviews ?? 0} />
          <Stat label="Answers" value={stats?.answers ?? 0} />
          <Stat label="Avg score" value={stats?.average != null ? stats.average.toFixed(1) : "–"} />
        </div>
        <div>
          <h2 className="mb-3 text-xl font-semibold">Activity</h2>
          <ActivityHeatmap timestamps={activity} />
        </div>
      </section>
    </div>
  );
}