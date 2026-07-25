import React, { useEffect, useMemo, useState } from "react";
import profilePicSrc from "./pro.jpg";

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
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState("");
    const [backendOk, setBackendOk] = useState(false);
    const [searchEmptyMsg, setSearchEmptyMsg] = useState(false);

    const [searchCount, setSearchCount] = useState(0);
    const [countLoading, setCountLoading] = useState(true);

    const [q, setQ] = useState("");
    const [batch, setBatch] = useState("");
    const [district, setDistrict] = useState("");
    const [org, setOrg] = useState("");
    const [hasSearched, setHasSearched] = useState(false);

    const [showAdd, setShowAdd] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
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
                setInitialLoading(true);
                setLoading(true);
                const res = await fetch(`${API_BASE}/alumni`);
                const data = await res.json();
                if (!Array.isArray(data)) throw new Error("Unexpected response");
                setAlumni(data);
                setDisplay([]);
                setBackendOk(true);
            } catch (e) {
                setBackendOk(false);
                setDisplay([]);
                setError("Couldn't fetch alumni. Check your backend is running.");
            } finally {
                setInitialLoading(false);
                setLoading(false);
            }
        })();

        (async () => {
            try {
                setCountLoading(true);
                const res = await fetch(`${API_BASE}/stats/visit`, { method: "POST" });
                if (!res.ok) throw new Error("stats fetch failed");
                const data = await res.json();
                setSearchCount(data.total || 0);
            } catch (_) {
                try {
                    const res = await fetch(`${API_BASE}/stats`);
                    if (res.ok) {
                        const data = await res.json();
                        setSearchCount(data.total || 0);
                    }
                } catch (__) {}
            } finally {
                setCountLoading(false);
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

    const onSearch = async (e) => {
        e?.preventDefault?.();
        setError("");

        const hasQ = q.trim() !== "";
        const hasBatch = batch.trim() !== "";
        const hasDistrict = district.trim() !== "";
        const hasOrg = org.trim() !== "";
        const anyFilter = hasQ || hasBatch || hasDistrict || hasOrg;

        if (!anyFilter) {
            setSearchEmptyMsg(true);
            setHasSearched(false);
            setDisplay([]);
            return;
        }

        setSearchEmptyMsg(false);
        setHasSearched(true);

        const url = new URL(`${API_BASE}/alumni`);
        if (hasQ) url.searchParams.set("q", q.trim());
        if (hasBatch) url.searchParams.set("batch", batch.trim());
        if (hasDistrict) url.searchParams.set("district", district.trim());
        if (hasOrg) url.searchParams.set("organization", org.trim());

        try {
            setLoading(true);
            const res = await fetch(url.toString());
            if (!res.ok) throw new Error("Backend query not supported");
            const data = await res.json();
            if (!Array.isArray(data)) throw new Error("Unexpected response");
            setDisplay(data);
            setBackendOk(true);
        } catch (_) {
            setDisplay(
                alumni.filter((row) => {
                    const needle = (q || "").trim().toLowerCase();
                    const nameVal = String(row?.[COL.NAME] || "").toLowerCase();
                    const batchVal = String(row?.[COL.BATCH] || "").trim();
                    const distVal = String(row?.[COL.DISTRICT] || "").trim();
                    const orgVal = String(row?.[COL.ORG] || "").trim();
                    const nameOk = !needle || nameVal.includes(needle);
                    const bOk = !hasBatch || batchVal === batch.trim();
                    const dOk = !hasDistrict || distVal === district.trim();
                    const oOk = !hasOrg || orgVal === org.trim();
                    return nameOk && bOk && dOk && oOk;
                })
            );
        } finally {
            setLoading(false);
        }

        try {
            const statRes = await fetch(`${API_BASE}/stats/search`, { method: "POST" });
            if (statRes.ok) {
                const statData = await statRes.json();
                setSearchCount(statData.total || 0);
            }
        } catch (_) {}
    };

    const onClear = () => {
        setQ(""); setBatch(""); setDistrict(""); setOrg("");
        setDisplay([]);
        setHasSearched(false);
        setSearchEmptyMsg(false);
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

    return (
        <div style={sx.page}>
            <div style={sx.headerWrap}>
                <h1 style={sx.title}>NITER EEE Alumni Directory</h1>
                <p style={sx.subtitle}>
                    Alumni searches till date: <span style={sx.number}>{countLoading ? "—" : searchCount.toLocaleString()}</span>
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
                {initialLoading ? (
                    <div style={sx.loading}>
                        <div style={sx.spinner}></div>
                        <div style={{ marginTop: 12 }}>Connecting…</div>
                    </div>
                ) : loading && hasSearched ? (
                    <div style={sx.loading}>
                        <div style={sx.spinner}></div>
                        <div style={{ marginTop: 12 }}>Searching…</div>
                    </div>
                ) : !hasSearched ? (
                    searchEmptyMsg ? (
                        <div style={sx.messageInfo}>Enter a name, batch, district, or organization to search.</div>
                    ) : backendOk ? (
                        <div style={sx.messageGood}>You are good to go find someone.</div>
                    ) : (
                        <div style={sx.messageBad}>backend is currapted</div>
                    )
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

            <footer style={sx.footer} onClick={() => setShowProfile(false)}>
                <span style={{ width: 48 }}></span>
                <span style={sx.footerText}>
                    Developed by Hasibul Hassan Mobin. All rights reserved.
                </span>
                <div style={{ position: "relative", width: 48 }} onClick={(e) => e.stopPropagation()}>
                    <button
                        type="button"
                        onClick={() => setShowProfile((v) => !v)}
                        title="Developer Profile"
                        style={sx.avatarBtn}
                    >
                        <div style={sx.avatarPlaceholder}>
                            <img
                                src={profilePicSrc}
                                alt="Hasibul Hassan Mobin"
                                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                            />
                        </div>
                    </button>

                    {showProfile && (
                        <div style={sx.profilePopup} onClick={(e) => e.stopPropagation()}>
                            <div style={sx.profilePic}>
                                <img
                                    src={profilePicSrc}
                                    alt="Hasibul Hassan Mobin"
                                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                                />
                            </div>
                            <div style={sx.profileName}>Hasibul Hassan Mobin</div>
                            <div style={sx.socialRow}>
                                <a
                                    href="https://www.facebook.com/hasibulhassanmobin/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={sx.socialBtn}
                                    title="Facebook"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2" aria-hidden>
                                        <path d="M13.5 21V14H16L16.5 10.5H13.5V8.5C13.5 7.53 13.77 6.9 15.06 6.9H16.5V3.6C16.25 3.56 15.4 3.5 14.36 3.5C12.22 3.5 10.8 4.8 10.8 7.26V10.5H8V14H10.8V21H13.5Z"/>
                                    </svg>
                                </a>
                                <a
                                    href="https://www.linkedin.com/in/md-hasibul-hassan-mobin-0047a724b/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={sx.socialBtn}
                                    title="LinkedIn"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#0A66C2" aria-hidden>
                                        <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6C1.12 6 0 4.88 0 3.5C0 2.12 1.12 1 2.5 1C3.87 1 4.98 2.12 4.98 3.5ZM0.24 8H4.76V23H0.24V8ZM8.16 8H12.46V10.18H12.52C13.12 9.04 14.58 7.9 16.94 7.9C21.9 7.9 23 11.18 23 15.58V23H18.5V16.34C18.5 14.16 18.12 12.54 16.9 12.54C15.42 12.54 14.46 13.68 14.46 15.36V23H10V8H8.16Z"/>
                                    </svg>
                                </a>
                                <a
                                    href="https://adek007.github.io/mobin/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={sx.socialBtn}
                                    title="Website"
                                >
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6C5CE7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                        <circle cx="12" cy="12" r="10"/>
                                        <path d="M2 12h20"/>
                                        <path d="M12 2C14.5 5.5 15.5 8.5 15.5 12C15.5 15.5 14.5 18.5 12 22C9.5 18.5 8.5 15.5 8.5 12C8.5 8.5 9.5 5.5 12 2Z"/>
                                    </svg>
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </footer>
        </div>
    );
}

const purple = "#6C5CE7";
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
        padding: "36px 20px 110px",
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

    loading: {
        textAlign: "center",
        padding: "32px 24px",
        color: textDim,
        background: cardBg,
        border: `1px solid ${border}`,
        borderRadius: 16,
        maxWidth: 980,
        margin: "6px auto 0",
    },
    spinner: {
        width: 36,
        height: 36,
        border: `4px solid ${border}`,
        borderTop: `4px solid ${purple}`,
        borderRadius: "50%",
        animation: "spin 0.9s linear infinite",
        margin: "0 auto",
        display: "block",
    },
    error: { textAlign: "center", padding: 24, color: "#ff8080" },
    empty: { textAlign: "center", padding: 24, color: textDim },
    messageInfo: {
        maxWidth: 980,
        margin: "6px auto 0",
        textAlign: "center",
        padding: "28px 24px",
        background: "#1a1d2c",
        border: "1px solid #2f3550",
        borderRadius: 16,
        color: "#b4c0ff",
        fontSize: 17,
        fontWeight: 500,
    },
    messageGood: {
        maxWidth: 980,
        margin: "6px auto 0",
        textAlign: "center",
        padding: "32px 24px",
        background: cardBg,
        border: `1px solid ${border}`,
        borderRadius: 16,
        color: text,
        fontSize: 20,
        fontWeight: 600,
    },
    messageBad: {
        maxWidth: 980,
        margin: "6px auto 0",
        textAlign: "center",
        padding: "32px 24px",
        background: "#2a1717",
        border: "1px solid #5a2a2a",
        borderRadius: 16,
        color: "#ff8080",
        fontSize: 20,
        fontWeight: 600,
    },

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

    footer: {
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        maxWidth: 1020,
        margin: "0 auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 20px",
        background: "rgba(27, 28, 32, 0.85)",
        backdropFilter: "blur(10px)",
        borderTop: `1px solid ${border}`,
        zIndex: 20,
    },
    footerText: {
        color: textDim,
        fontSize: 13,
        textAlign: "center",
        flex: 1,
    },
    avatarBtn: {
        width: 40,
        height: 40,
        borderRadius: "50%",
        padding: 0,
        border: `1px solid ${border}`,
        background: "#121318",
        cursor: "pointer",
        display: "grid",
        placeItems: "center",
        transition: "transform 0.15s ease, border-color 0.15s ease",
        float: "right",
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: "50%",
        background: "#121318",
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        color: textDim,
    },
    profilePopup: {
        position: "absolute",
        bottom: 56,
        right: 0,
        width: 260,
        background: cardBg,
        border: `1px solid ${border}`,
        borderRadius: 14,
        padding: "20px 18px 16px",
        boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
        textAlign: "center",
        animation: "popIn 0.16s ease-out",
        zIndex: 30,
    },
    profilePic: {
        width: 76,
        height: 76,
        borderRadius: "50%",
        background: "#121318",
        border: `2px solid ${border}`,
        margin: "0 auto 12px",
        display: "grid",
        placeItems: "center",
        color: textDim,
        overflow: "hidden",
    },
    profileName: {
        fontWeight: 700,
        fontSize: 15,
        color: text,
        marginBottom: 12,
    },
    socialRow: {
        display: "flex",
        gap: 10,
        justifyContent: "center",
    },
    socialBtn: {
        width: 40,
        height: 40,
        borderRadius: 10,
        background: "#121318",
        border: `1px solid ${border}`,
        display: "grid",
        placeItems: "center",
        cursor: "pointer",
        textDecoration: "none",
        transition: "transform 0.12s ease, border-color 0.12s ease, background 0.12s ease",
    },
};
