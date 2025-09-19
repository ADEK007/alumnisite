import React, { useEffect, useMemo, useState } from "react";

/**
 * AlumniDirectory
 * - Dark UI matching your screenshot
 * - Search inputs: name, batch, country, organization
 * - Calls GET /alumni (array-of-arrays: [name,batch,country,organization])
 * - On Search: tries backend query params; if that fails, filters locally
 * - "Add New Alumni" posts to /alumni with the same fields (modal inline)
 * - Replace `PHOTO_URL` with your image (or remove the <img/> at bottom)
 */
export default function AlumniDirectory() {
    const API_BASE = "http://localhost:5000";
    const PHOTO_URL =
        "https://images.unsplash.com/photo-1544006659-f0b21884ce1d?q=80&w=640&auto=format&fit=crop"; // replace as needed

    const [alumni, setAlumni] = useState([]);            // raw data from sheets
    const [display, setDisplay] = useState([]);          // filtered view
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // search form state
    const [q, setQ] = useState("");
    const [batch, setBatch] = useState("");
    const [country, setCountry] = useState("");
    const [org, setOrg] = useState("");

    // add-alumni modal state
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ name: "", batch: "", country: "", organization: "" });
    const [adding, setAdding] = useState(false);

    // Fetch all alumni on mount
    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const res = await fetch(`${API_BASE}/alumni`);
                const data = await res.json();
                // Expecting: [["Name","28th","USA","Google"], ...]
                setAlumni(Array.isArray(data) ? data : []);
                setDisplay(Array.isArray(data) ? data : []);
            } catch (e) {
                setError("Couldn't fetch alumni. Check your backend is running.");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // Build unique dropdown options from current dataset
    const { batches, countries, orgs } = useMemo(() => {
        const b = new Set(), c = new Set(), o = new Set();
        alumni.forEach((row) => {
            if (row?.[1]) b.add(row[1]);
            if (row?.[2]) c.add(row[2]);
            if (row?.[3]) o.add(row[3]);
        });
        const sort = (arr) => [...arr].sort((x, y) => String(x).localeCompare(String(y)));
        return { batches: sort(b), countries: sort(c), orgs: sort(o) };
    }, [alumni]);

    // Local filter fallback (used if backend query is not implemented)
    const filterLocally = () => {
        const needle = q.trim().toLowerCase();
        setDisplay(
            alumni.filter((row) => {
                const [name = "", b = "", c = "", o = ""] = row;
                const nameOk = !needle || name.toLowerCase().includes(needle);
                const bOk = !batch || b === batch;
                const cOk = !country || c === country;
                const oOk = !org || o === org;
                return nameOk && bOk && cOk && oOk;
            })
        );
    };

    // Attempt a backend search; if it fails, do local filtering
    const onSearch = async (e) => {
        e?.preventDefault?.();
        setError("");

        // try backend query first
        const url = new URL(`${API_BASE}/alumni`);
        if (q) url.searchParams.set("q", q);
        if (batch) url.searchParams.set("batch", batch);
        if (country) url.searchParams.set("country", country);
        if (org) url.searchParams.set("organization", org);

        try {
            setLoading(true);
            const res = await fetch(url.toString());
            // If server returns 404/501 for unimplemented query, fall back below
            if (!res.ok) throw new Error("Backend query not supported");
            const data = await res.json();
            if (!Array.isArray(data)) throw new Error("Unexpected response");
            setDisplay(data);
        } catch (_) {
            // local fallback
            filterLocally();
        } finally {
            setLoading(false);
        }
    };

    const onClear = () => {
        setQ(""); setBatch(""); setCountry(""); setOrg("");
        setDisplay(alumni);
    };

    const addAlumni = async () => {
        const { name, batch, country, organization } = form;
        if (!name || !batch || !country || !organization) {
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
            // Optimistic update
            const row = [name, batch, country, organization];
            setAlumni((prev) => [...prev, row]);
            setDisplay((prev) => [...prev, row]);
            setForm({ name: "", batch: "", country: "", organization: "" });
            setShowAdd(false);
        } catch (e) {
            alert("Couldn't add alumni. Check server logs.");
        } finally {
            setAdding(false);
        }
    };

    // --- UI ---
    return (
        <div style={sx.page}>
            {/* Header */}
            <div style={sx.headerWrap}>
                <h1 style={sx.title}>NITER EEE Alumni Directory</h1>
                <p style={sx.subtitle}>Alumni searches till date: <span style={sx.number}>500</span></p>
            </div>

            {/* Search Card */}
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
                    <select style={sx.input} value={country} onChange={(e) => setCountry(e.target.value)}>
                        <option value="">Select country</option>
                        {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select style={sx.input} value={org} onChange={(e) => setOrg(e.target.value)}>
                        <option value="">Select organization</option>
                        {orgs.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                </div>

                {/* Buttons row */}
                <div style={sx.buttonsRow}>
                    <button type="submit" style={sx.primaryBtn}>Search</button>
                    <button type="button" onClick={onClear} style={sx.ghostBtn}>Clear</button>
                </div>
            </form>


            {/* Welcome / CTA Card */}
            <div style={sx.welcomeCard}>
                <h3 style={sx.welcomeTitle}>Welcome to the NITER EEE Alumni Directory!</h3>
                <p style={sx.welcomeText}>
                    Use the search form above to find alumni by name, batch, country, or organization.
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

            {/* Results (simple list to keep page like the screenshot — you can replace with cards/table) */}
            <div style={sx.resultsWrap}>
                {loading ? (
                    <div style={sx.loading}>Loading…</div>
                ) : error ? (
                    <div style={sx.error}>{error}</div>
                ) : display.length === 0 ? (
                    <div style={sx.empty}>No alumni found.</div>
                ) : (
                    <ul style={sx.resultsList}>
                        {display.map((row, i) => (
                            <li key={i} style={sx.resultItem}>
                                <span style={sx.name}>{row?.[0] || "-"}</span>
                                <span style={sx.meta}>{row?.[1] || "-"}</span>
                                <span style={sx.meta}>{row?.[2] || "-"}</span>
                                <span style={sx.meta}>{row?.[3] || "-"}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>



            {/* Add Alumni Modal */}
            {showAdd && (
                <div style={sx.modalOverlay} onClick={() => setShowAdd(false)}>
                    <div style={sx.modal} onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ margin: 0 }}>Add New Alumni</h3>
                        <div style={sx.modalBody}>
                            <input
                                style={sx.modalInput}
                                placeholder="Name"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                            />
                            <input
                                style={sx.modalInput}
                                placeholder="Batch"
                                value={form.batch}
                                onChange={(e) => setForm({ ...form, batch: e.target.value })}
                            />
                            <input
                                style={sx.modalInput}
                                placeholder="Country"
                                value={form.country}
                                onChange={(e) => setForm({ ...form, country: e.target.value })}
                            />
                            <input
                                style={sx.modalInput}
                                placeholder="Organization"
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

/* ---------- styles (CSS-in-JS) ---------- */
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
        display: "grid",
        gridTemplateColumns: "2fr 1fr 1fr 1fr auto auto",
        gap: 12,
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

    roundPhoto: {
        position: "fixed",
        right: 24,
        bottom: 24,
        width: 140,
        height: 140,
        objectFit: "cover",
        borderRadius: "50%",
        border: `4px solid ${pageBg}`,
        boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
        pointerEvents: "none",
    },
    card: {
        maxWidth: 980,
        margin: "0 auto",
        background: "#1b1c20",
        borderRadius: 16,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 16,
    },
    inputsRow: {
        display: "grid",
        gridTemplateColumns: "2fr 1fr 1fr 1fr",
        gap: 12,
    },
    buttonsRow: {
        display: "flex",
        justifyContent: "center",
        gap: 12,
    },

    /* Modal */
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
