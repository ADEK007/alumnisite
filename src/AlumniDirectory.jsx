import React, { useEffect, useMemo, useState } from "react";

const COL = {
  NAME: 0,
  BATCH: 1,
  STUDENT_ID: 2,
  PHONE: 3,
  EMAIL: 4,
  NAME_BN: 5,
  COL_G: 6,
  PRESENT_ADDR: 7,
  DISTRICT: 8,
  BLOOD: 9,
  STATUS: 10,
  ORG: 11,
  COL_M: 12,
  COL_N: 13,
  COL_O: 14,
};

export default function AlumniDirectory() {
    const API_BASE = "http://localhost:5000";

    const [alumni, setAlumni] = useState([]);
    const [display, setDisplay] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [q, setQ] = useState("");
    const [batch, setBatch] = useState("");
    const [district, setDistrict] = useState("");
    const [org, setOrg] = useState("");

    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({
        name: "",
        batch: "",
        district: "",
        organization: "",
    });
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const res = await fetch(`${API_BASE}/alumni`);
                const data = await res.json();
                const rows = Array.isArray(data) ? data : [];
                setAlumni(rows);
                setDisplay(rows);
            } catch (e) {
                setError("Couldn't fetch alumni. Check your backend is running.");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const { batches, districts, orgs } = useMemo(() => {
        const b = new Set(), d = new Set(), o = new Set();
        alumni.forEach((row) => {
            const batchVal = row?.[COL.BATCH];
            const distVal = row?.[COL.DISTRICT];
            const orgVal = row?.[COL.ORG];
            if (batchVal && String(batchVal).trim()) b.add(String(batchVal).trim());
            if (distVal && String(distVal).trim()) d.add(String(distVal).trim());
            if (orgVal && String(orgVal).trim()) o.add(String(orgVal).trim());
        });
        const sort = (arr) => [...arr].sort((x, y) => String(x).localeCompare(String(y)));
        return { batches: sort(b), districts: sort(d), orgs: sort(o) };
    }, [alumni]);

    const filterLocally = () => {
        const needle = q.trim().toLowerCase();
        setDisplay(
            alumni.filter((row) => {
                const nameVal = String(row?.[COL.NAME] || "").toLowerCase();
                const batchVal = String(row?.[COL.BATCH] || "").trim();
                const distVal = String(row?.[COL.DISTRICT] || "").trim();
                const orgVal = String(row?.[COL.ORG] || "").trim();
                const nameOk = !needle || nameVal.includes(needle);
                const bOk = !batch || batchVal === batch;
                const dOk = !district || distVal === district;
                const oOk = !org || orgVal === org;
                return nameOk && bOk && dOk && oOk;
            })
        );
    };

    const onSearch = async (e) => {
        e?.preventDefault?.();
        setError("");

        const url = new URL(`${API_BASE}/alumni`);
        if (q) url.searchParams.set("q", q);
        if (batch) url.searchParams.set("batch", batch);
        if (district) url.searchParams.set("district", district);
        if (org) url.searchParams.set("organization", org);

        try {
            setLoading(true);
            const res = await fetch(url.toString());
            if (!res.ok) throw new Error("Backend query not supported");
            const data = await res.json();
            if (!Array.isArray(data)) throw new Error("Unexpected response");
            setDisplay(data);
        } catch (_) {
            filterLocally();
        } finally {
            setLoading(false);
        }
    };

    const onClear = () => {
        setQ(""); setBatch(""); setDistrict(""); setOrg("");
        setDisplay(alumni);
    };

    const addAlumni = async () => {
        const { name, batch, district, organization } = form;
        if (!name || !batch || !district || !organization) {
            alert("Please fill all fields");
            return;
        }
        try {
            setAdding(true);
            const res = await fetch(`${API_BASE}/alumni`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            if (!res.ok) throw new Error("Add failed");
            const row = [name, batch, "", "", "", "", "", "", district, "", "", organization];
            setAlumni((prev) => [...prev, row]);
            setDisplay((prev) => [...prev, row]);
            setForm({ name: "", batch: "", district: "", organization: "" });
            setShowAdd(false);
        } catch (e) {
            alert("Couldn't add alumni. Check server logs.");
        } finally {
            setAdding(false);
        }
    };

    const totalAlumni = alumni.length;

    return (
        <div style={sx.page}>
            <div style={sx.headerWrap}>
                <h1 style={sx.title}>NITER EEE Alumni Directory</h1>
                <p style={sx.subtitle}>
                    Total alumni registered till date: <span style={sx.number}>{loading ? "—" : totalAlumni.toLocaleString()}</span>
                </p>
            </div>

            <form onSubmit={onSearch} style={sx.card}>
                <div style={sx.inputsRow}>
                    <input
                        style={{ ...sx.input, flex: 2 }}
                        placeholder="Search by name"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                    />
                    <select style={sx.input} value={batch} onChange={(e) => setBatch(e.target.value)}>
                        <option value="">Select batch</option>
                        {batches.map((b) => <option key={b} value={b}>{b}</option>)}
                    </select>
                    <select style={sx.input} value={district} onChange={(e) => setDistrict(e.target.value)}>
                        <option value="">Select district</option>
                        {districts.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <select style={sx.input} value={org} onChange={(e) => setOrg(e.target.value)}>
                        <option value="">Select university / org</option>
                        {orgs.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                </div>

                <div style={sx.buttonsRow}>
                    <button type="submit" style={sx.primaryBtn}>Search</button>
                    <button type="button" onClick={onClear} style={sx.ghostBtn}>Clear</button>
                </div>
            </form>

            <div style={sx.welcomeCard}>
                <h3 style={sx.welcomeTitle}>Welcome to the NITER EEE Alumni Directory!</h3>
                <p style={sx.welcomeText}>
                    Use the search form above to find alumni by name, batch, district, or university / organization.
                </p>
                <button style={sx.addBtn} onClick={() => setShowAdd(true)}>Add New Alumni</button>
                <p style={sx.smallNote}>
                    The directory is updated with information of batches starting from 1st till 28th.
                    <br />
                    A special thank you to all the <b>admins in EEE Group</b> who helped out with the initial data collection!
                    <br />
                    <span style={{ opacity: 0.9 }}>Made with love for the NITER EEE community ❤️</span>
                </p>
            </div>

            <div style={sx.resultsWrap}>
                {loading ? (
                    <div style={sx.loading}>Loading…</div>
                ) : error ? (
                    <div style={sx.error}>{error}</div>
                ) : display.length === 0 ? (
                    <div style={sx.empty}>No alumni found.</div>
                ) : (
                    <ul style={sx.resultsList}>
                        <li key="header" style={{ ...sx.resultItem, background: "#1b1c20", borderTopLeftRadius: 10, borderTopRightRadius: 10, fontWeight: 700 }}>
                            <span style={sx.name}>Name</span>
                            <span style={sx.meta}>Batch</span>
                            <span style={sx.meta}>District</span>
                            <span style={sx.meta}>University / Org</span>
                        </li>
                        {display.map((row, i) => (
                            <li key={i} style={sx.resultItem}>
                                <span style={sx.name}>{row?.[COL.NAME] || "-"}</span>
                                <span style={sx.meta}>{row?.[COL.BATCH] || "-"}</span>
                                <span style={sx.meta}>{row?.[COL.DISTRICT] || "-"}</span>
                                <span style={sx.meta}>{row?.[COL.ORG] || "-"}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {showAdd && (
                <div style={sx.modalOverlay} onClick={() => setShowAdd(false)}>
                    <div style={sx.modal} onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ margin: 0 }}>Add New Alumni</h3>
                        <div style={sx.modalBody}>
                            <input
                                style={sx.modalInput}
                                placeholder="Full Name"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                            />
                            <input
                                style={sx.modalInput}
                                placeholder="Batch (e.g. 12th Batch 2021-22)"
                                value={form.batch}
                                onChange={(e) => setForm({ ...form, batch: e.target.value })}
                            />
                            <input
                                style={sx.modalInput}
                                placeholder="Home District"
                                value={form.district}
                                onChange={(e) => setForm({ ...form, district: e.target.value })}
                            />
                            <input
                                style={sx.modalInput}
                                placeholder="University / Organization"
                                value={form.organization}
                                onChange={(e) => setForm({ ...form, organization: e.target.value })}
                            />
                        </div>
                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                            <button style={sx.ghostBtn} onClick={() => setShowAdd(false)}>Cancel</button>
                            <button style={sx.primaryBtn} disabled={adding} onClick={addAlumni}>
                                {adding ? "Adding…" : "Add"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

const purple = "#6C5CE7";
const purpleDim = "#5a4fd1";
const cardBg = "#1b1c20";
const pageBg = "#0f1013";
const text = "#e7e7ea";
const textDim = "#a5a7ae";
const border = "#2a2c33";

const sx = {
    page: {
        minHeight: "100vh",
        background: pageBg,
        color: text,
        fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
        padding: "36px 20px 80px",
        position: "relative",
        overflowX: "hidden",
    },
    headerWrap: { textAlign: "center", marginBottom: 24 },
    title: { fontSize: 36, fontWeight: 800, margin: 0 },
    subtitle: { marginTop: 8, color: textDim },
    number: { color: text, fontWeight: 700 },

    card: {
        maxWidth: 980,
        margin: "0 auto",
        background: cardBg,
        border: `1px solid ${border}`,
        borderRadius: 16,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 16,
    },
    input: {
        height: 44,
        background: "#121318",
        border: `1px solid ${border}`,
        color: text,
        borderRadius: 10,
        padding: "0 12px",
        outline: "none",
    },
    primaryBtn: {
        height: 44,
        padding: "0 18px",
        background: purple,
        border: "none",
        color: "white",
        borderRadius: 10,
        cursor: "pointer",
        fontWeight: 600,
    },
    ghostBtn: {
        height: 44,
        padding: "0 16px",
        background: "transparent",
        border: `1px solid ${border}`,
        color: text,
        borderRadius: 10,
        cursor: "pointer",
    },

    welcomeCard: {
        maxWidth: 980,
        margin: "18px auto 10px",
        background: cardBg,
        border: `1px solid ${border}`,
        borderRadius: 16,
        padding: "28px 24px",
        textAlign: "center",
    },
    welcomeTitle: { margin: "0 0 8px 0", fontSize: 20, fontWeight: 700 },
    welcomeText: { margin: "0 0 18px 0", color: textDim },
    addBtn: {
        height: 44,
        padding: "0 18px",
        background: "#2d2f39",
        border: `1px solid ${border}`,
        color: text,
        borderRadius: 10,
        cursor: "pointer",
        marginBottom: 18,
    },
    smallNote: { fontSize: 13, lineHeight: 1.6, color: textDim },

    resultsWrap: { maxWidth: 980, margin: "6px auto 0" },
    resultsList: { listStyle: "none", margin: 0, padding: 0 },
    resultItem: {
        display: "grid",
        gridTemplateColumns: "2fr 1fr 1fr 1fr",
        gap: 12,
        padding: "14px 16px",
        borderBottom: `1px solid ${border}`,
        background: "#13141a",
    },
    name: { fontWeight: 600 },
    meta: { color: textDim },

    loading: { textAlign: "center", padding: 24, color: textDim },
    error: { textAlign: "center", padding: 24, color: "#ff8080" },
    empty: { textAlign: "center", padding: 24, color: textDim },

    modalOverlay: {
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "grid",
        placeItems: "center",
        zIndex: 50,
    },
    modal: {
        width: "min(520px, 92vw)",
        background: cardBg,
        border: `1px solid ${border}`,
        borderRadius: 16,
        padding: 20,
        boxShadow: "0 15px 50px rgba(0,0,0,0.55)",
    },
    modalBody: {
        margin: "14px 0 18px",
        display: "grid",
        gap: 10,
    },
    modalInput: {
        height: 44,
        background: "#121318",
        border: `1px solid ${border}`,
        color: text,
        borderRadius: 10,
        padding: "0 12px",
        outline: "none",
    },
};
