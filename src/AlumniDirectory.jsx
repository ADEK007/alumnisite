import React, { useEffect, useMemo, useState } from "react";
import profilePicSrc from "./pro.jpg";
import "./App.css";

const COL = {
  NAME: 0,
  BATCH: 1,
  STUDENT_ID: 2,
  PHONE: 3,
  EMAIL: 4,
  FACEBOOK: 5,
  LINKEDIN: 6,
  CURRENT_ADDR: 7,
  HOMETOWN: 8,
  BLOOD: 9,
  POSITION: 10,
  COMPANY: 11,
  FIELD: 12,
  PREV_EXP: 13,
  SKILLS: 14,
};

const BATCH_OPTIONS = [
  "08th Batch (2017-18)",
  "09th Batch (2018-19)",
  "10th Batch (2019-20)",
  "11th Batch (2020-21)",
  "12th Batch (2021-22)",
  "13th Batch (2022-23)",
  "14th Batch (2023-24)",
  "15th Batch (2023-24)",
];

const POSITION_OPTIONS = ["Student", "None", "Type"];

const BLOOD_OPTIONS = [
  "A (+ve)",
  "A (-ve)",
  "B (+ve)",
  "B (-ve)",
  "AB (+ve)",
  "AB (-ve)",
  "O (+ve)",
  "O (-ve)",
];

export default function AlumniDirectory() {
  const API_BASE =
    typeof window !== "undefined" && window.location.hostname !== "localhost"
      ? window.location.origin
      : "http://localhost:5000";

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
  const [adding, setAdding] = useState(false);

  const [formErrors, setFormErrors] = useState({});
  const [addPosMode, setAddPosMode] = useState("");
  const [addForm, setAddForm] = useState({
    name: "",
    batch: "",
    studentId: "",
    phone: "",
    email: "",
    facebook: "",
    linkedin: "",
    currentAddress: "",
    hometown: "",
    bloodGroup: "",
    position: "",
    positionCustom: "",
    company: "",
    field: "",
    previousExperience: "",
    skills: "",
  });

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
  }, [API_BASE]);

  const { batches, districts, orgs } = useMemo(() => {
    const b = new Set(),
      d = new Set(),
      o = new Set();
    alumni.forEach((row) => {
      const batchVal = row?.[COL.BATCH];
      const distVal = row?.[COL.HOMETOWN];
      const orgVal = row?.[COL.COMPANY];
      if (batchVal && String(batchVal).trim()) b.add(String(batchVal).trim());
      if (distVal && String(distVal).trim()) d.add(String(distVal).trim());
      if (orgVal && String(orgVal).trim()) o.add(String(orgVal).trim());
    });
    const sort = (arr) =>
      [...arr].sort((x, y) => String(x).localeCompare(String(y)));
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
          const distVal = String(row?.[COL.HOMETOWN] || "").trim();
          const orgVal = String(row?.[COL.COMPANY] || "").trim();
          const nameOk = !needle || nameVal.includes(needle);
          const bOk = !hasBatch || batchVal === batch.trim();
          const dOk = !hasDistrict || distVal === district.trim();
          const oOk = !hasOrg || orgVal === org.trim();
          return nameOk && bOk && dOk && oOk;
        }),
      );
    } finally {
      setLoading(false);
    }

    try {
      const statRes = await fetch(`${API_BASE}/stats/search`, {
        method: "POST",
      });
      if (statRes.ok) {
        const statData = await statRes.json();
        setSearchCount(statData.total || 0);
      }
    } catch (_) {}
  };

  const onClear = () => {
    setQ("");
    setBatch("");
    setDistrict("");
    setOrg("");
    setDisplay([]);
    setHasSearched(false);
    setSearchEmptyMsg(false);
  };

  const setAddField = (k, v) => setAddForm((f) => ({ ...f, [k]: v }));

  const openAdd = () => {
    setAddForm({
      name: "",
      batch: "",
      studentId: "",
      phone: "",
      email: "",
      facebook: "",
      linkedin: "",
      currentAddress: "",
      hometown: "",
      bloodGroup: "",
      position: "",
      positionCustom: "",
      company: "",
      field: "",
      previousExperience: "",
      skills: "",
    });
    setAddPosMode("");
    setFormErrors({});
    setShowAdd(true);
  };

  const validateAdd = () => {
    const e = {};
    if (!addForm.name.trim()) e.name = true;
    if (!addForm.batch.trim()) e.batch = true;
    if (!addForm.studentId.trim()) e.studentId = true;
    if (!addForm.phone.trim()) e.phone = true;
    if (!addForm.email.trim()) e.email = true;
    if (!addForm.facebook.trim()) e.facebook = true;
    if (!addForm.currentAddress.trim()) e.currentAddress = true;
    if (!addForm.hometown.trim()) e.hometown = true;
    if (!addForm.bloodGroup.trim()) e.bloodGroup = true;

    const mode = addPosMode;
    if (!mode) {
      e.position = true;
    } else if (mode === "Type") {
      if (!addForm.positionCustom.trim()) e.position = true;
    }

    const posValue =
      mode === "Type" ? addForm.positionCustom.trim() : mode.trim();
    const isHidden =
      posValue.toLowerCase() === "student" || posValue.toLowerCase() === "none";
    if (!isHidden) {
      if (!addForm.company.trim()) e.company = true;
      if (!addForm.field.trim()) e.field = true;
      if (!addForm.previousExperience.trim()) e.previousExperience = true;
      if (!addForm.skills.trim()) e.skills = true;
    }

    setFormErrors(e);
    return Object.keys(e).length === 0;
  };

  const addAlumni = async () => {
    if (!validateAdd()) return;

    const mode = addPosMode;
    const posValue =
      mode === "Type" ? addForm.positionCustom.trim() : mode.trim();

    const payload = {
      name: addForm.name.trim(),
      batch: addForm.batch.trim(),
      studentId: addForm.studentId.trim(),
      phone: addForm.phone.trim(),
      email: addForm.email.trim(),
      facebook: addForm.facebook.trim(),
      linkedin: addForm.linkedin.trim(),
      currentAddress: addForm.currentAddress.trim(),
      hometown: addForm.hometown.trim(),
      bloodGroup: addForm.bloodGroup.trim(),
      position: posValue,
      company: addForm.company.trim(),
      field: addForm.field.trim(),
      previousExperience: addForm.previousExperience.trim(),
      skills: addForm.skills.trim(),
    };

    try {
      setAdding(true);
      const res = await fetch(`${API_BASE}/alumni`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let msg = "Couldn't add alumni. Check server logs.";
        try {
          const d = await res.json();
          if (d?.missing) {
            msg = "Missing required: " + d.missing.join(", ");
          } else if (d?.error) {
            msg = d.error;
          }
        } catch (_) {}
        alert(msg);
        return;
      }
      const created = await res.json();
      if (created?.row && Array.isArray(created.row)) {
        setAlumni((prev) => [...prev, created.row]);
        setDisplay((prev) => [...prev, created.row]);
      }
      setShowAdd(false);
    } catch (e) {
      alert("Couldn't add alumni. Check server logs.");
    } finally {
      setAdding(false);
    }
  };

  const posValue =
    addPosMode === "Type" ? addForm.positionCustom.trim() : addPosMode.trim();
  const hideCompanyBlock =
    posValue.toLowerCase() === "student" || posValue.toLowerCase() === "none";

  return (
    <div style={sx.page} data-role="page" className="smooth-page">
      <div style={sx.content} data-role="content">
        <div style={sx.headerWrap} className="header-fade">
          <h1 style={sx.title} data-role="h1">
            NITER EEE Alumni Directory
          </h1>
          <p style={sx.subtitle} data-role="counter">
            Alumni searches till date:{" "}
            <span style={sx.number}>
              {countLoading ? "—" : searchCount.toLocaleString()}
            </span>
          </p>
        </div>

        <form
          onSubmit={onSearch}
          style={sx.card}
          data-role="form-card"
          className="card-fade smooth-card"
        >
          <div style={sx.inputsRow} data-role="inputs-row">
            <input
              style={{ ...sx.input, flex: 2 }}
              placeholder="Search by name"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              data-role="input"
              className="smooth-input"
            />
            <select
              style={sx.input}
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              data-role="select"
              className="smooth-input"
            >
              <option value="">Select batch</option>
              {batches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <select
              style={sx.input}
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              data-role="select"
              className="smooth-input"
            >
              <option value="">Select district</option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              style={sx.input}
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              data-role="select"
              className="smooth-input"
            >
              <option value="">Select university / org</option>
              {orgs.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          <div style={sx.buttonsRow} data-role="buttons-row">
            <button
              type="submit"
              style={sx.primaryBtn}
              data-role="primary-btn"
              className="smooth-btn primary-btn-glow"
            >
              Search
            </button>
            <button
              type="button"
              onClick={onClear}
              style={sx.ghostBtn}
              data-role="ghost-btn"
              className="smooth-btn"
            >
              Clear
            </button>
          </div>
        </form>

        <div
          style={sx.resultsWrap}
          data-role="results-wrap"
          className="results-wrap-fade"
        >
          {initialLoading ? (
            <div style={sx.loading} className="loading-enter">
              <div style={sx.spinner} className="spinner-smooth"></div>
              <div style={{ marginTop: 12 }} className="loading-text">
                Connecting…
              </div>
            </div>
          ) : loading && hasSearched ? (
            <div style={sx.loading} className="loading-enter">
              <div style={sx.spinner} className="spinner-smooth"></div>
              <div style={{ marginTop: 12 }} className="loading-text">
                Searching…
              </div>
            </div>
          ) : !hasSearched ? (
            searchEmptyMsg ? (
              <div
                style={sx.messageInfo}
                data-role="msg-info"
                className="message-enter"
              >
                Enter a name, batch, district, or organization to search.
              </div>
            ) : backendOk ? (
              <div
                style={sx.messageGood}
                data-role="msg-good"
                className="message-enter"
              >
                You are good to go find someone.
              </div>
            ) : (
              <div
                style={sx.messageBad}
                data-role="msg-bad"
                className="message-enter"
              >
                backend is currapted
              </div>
            )
          ) : error ? (
            <div style={sx.error} className="message-enter">
              {error}
            </div>
          ) : display.length === 0 ? (
            <div style={sx.empty} className="message-enter">
              No alumni found.
            </div>
          ) : (
            <ul
              style={sx.resultsList}
              data-role="results-list"
              className="result-list-fade"
            >
              <li
                key="header"
                style={{
                  ...sx.resultItem,
                  background: "#1b1c20",
                  borderTopLeftRadius: 10,
                  borderTopRightRadius: 10,
                  fontWeight: 700,
                  animationDelay: "0ms",
                }}
                data-role="result-item"
                className="smooth-result result-item-fade"
              >
                <span style={sx.name} data-role="name">
                  Name
                </span>
                <span style={sx.meta} data-role="meta">
                  Batch
                </span>
                <span style={sx.meta} data-role="meta">
                  District
                </span>
                <span style={sx.meta} data-role="meta">
                  University / Org
                </span>
              </li>
              {display.map((row, i) => {
                const cappedIndex = Math.min(i, 40);
                return (
                  <li
                    key={i}
                    style={{
                      ...sx.resultItem,
                      animationDelay: `${40 + cappedIndex * 22}ms`,
                    }}
                    data-role="result-item"
                    className="smooth-result result-item-fade"
                    tabIndex={0}
                  >
                    <span style={sx.name} data-role="name">
                      {row?.[COL.NAME] || "-"}
                    </span>
                    <span style={sx.meta} data-role="meta" data-label="Batch:">
                      {row?.[COL.BATCH] || "-"}
                    </span>
                    <span
                      style={sx.meta}
                      data-role="meta"
                      data-label="District:"
                    >
                      {row?.[COL.HOMETOWN] || "-"}
                    </span>
                    <span style={sx.meta} data-role="meta" data-label="Org:">
                      {row?.[COL.COMPANY] || "-"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div
          style={sx.welcomeCard}
          data-role="welcome-card"
          className="welcome-fade smooth-card"
        >
          <h3 style={sx.welcomeTitle} data-role="welcome-title">
            Welcome to the NITER EEE Alumni Directory!
          </h3>
          <p style={sx.welcomeText} data-role="welcome-text">
            Use the search form above to find alumni by name, batch, district,
            or university / organization.
          </p>
          <button
            style={sx.addBtn}
            data-role="add-btn"
            onClick={openAdd}
            className="smooth-btn"
          >
            Add New Alumni
          </button>
          <p style={sx.smallNote} data-role="small-note">
            The directory is updated with information of batches starting from
            1st till 8th (8th batch to 16th batch).
            <br />A special thank you to all the <b>Admins in EEE Group</b> who
            helped out with the initial data collection!
            <br />
            <span style={{ opacity: 0.9 }}>
              Made with love for the NITER EEE community ❤️
            </span>
          </p>
        </div>

        {showAdd && (
          <div
            style={sx.modalOverlay}
            onClick={() => setShowAdd(false)}
            className="modal-overlay-fade"
          >
            <div
              style={sx.modal}
              onClick={(e) => e.stopPropagation()}
              data-role="modal"
              className="modal-pop"
            >
              <div style={sx.modalHeaderWrap}>
                <h3 style={{ margin: 0, fontSize: 20 }}>Add New Alumni</h3>
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  aria-label="Close"
                  style={{
                    background: "transparent",
                    color: textDim,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 22,
                    lineHeight: 1,
                    padding: "4px 8px",
                    borderRadius: 8,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#24262f")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  ×
                </button>
              </div>

              <div style={sx.modalInner}>
                <div style={sx.modalBody} data-role="modal-body">
                  {/* ===== Section 1: Basic Info ===== */}
                  <div style={sx.modalSectionTitle}>Basic Information</div>

                  <div>
                    <label style={sx.fieldLabel}>Full Name *</label>
                    <input
                      style={{
                        ...sx.modalInput,
                        ...(formErrors.name ? sx.modalInputError : null),
                      }}
                      placeholder="Md. Hasibul Hassan Mobin"
                      value={addForm.name}
                      onChange={(e) => setAddField("name", e.target.value)}
                      data-role="modal-input"
                      className="smooth-input"
                    />
                  </div>

                  <div style={sx.modalRow2}>
                    <div>
                      <label style={sx.fieldLabel}>Batch / Session *</label>
                      <select
                        style={{
                          ...sx.modalInput,
                          ...(formErrors.batch ? sx.modalInputError : null),
                        }}
                        value={addForm.batch}
                        onChange={(e) => setAddField("batch", e.target.value)}
                        data-role="modal-input"
                        className="smooth-input"
                      >
                        <option value="">Select batch…</option>
                        {BATCH_OPTIONS.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={sx.fieldLabel}>Student ID *</label>
                      <input
                        style={{
                          ...sx.modalInput,
                          ...(formErrors.studentId ? sx.modalInputError : null),
                        }}
                        placeholder="EE 1810008"
                        value={addForm.studentId}
                        onChange={(e) =>
                          setAddField("studentId", e.target.value)
                        }
                        data-role="modal-input"
                        className="smooth-input"
                      />
                    </div>
                  </div>

                  <div style={sx.modalRow2}>
                    <div>
                      <label style={sx.fieldLabel}>
                        Phone number / Whatsapp *
                      </label>
                      <input
                        style={{
                          ...sx.modalInput,
                          ...(formErrors.phone ? sx.modalInputError : null),
                        }}
                        placeholder="01XXXXXXXXX"
                        value={addForm.phone}
                        onChange={(e) => setAddField("phone", e.target.value)}
                        data-role="modal-input"
                        className="smooth-input"
                      />
                    </div>
                    <div>
                      <label style={sx.fieldLabel}>Email address *</label>
                      <input
                        style={{
                          ...sx.modalInput,
                          ...(formErrors.email ? sx.modalInputError : null),
                        }}
                        placeholder="you@example.com"
                        type="email"
                        value={addForm.email}
                        onChange={(e) => setAddField("email", e.target.value)}
                        data-role="modal-input"
                        className="smooth-input"
                      />
                    </div>
                  </div>

                  <div style={sx.modalRow2}>
                    <div>
                      <label style={sx.fieldLabel}>Facebook link *</label>
                      <input
                        style={{
                          ...sx.modalInput,
                          ...(formErrors.facebook ? sx.modalInputError : null),
                        }}
                        placeholder="https://facebook.com/yourprofile"
                        value={addForm.facebook}
                        onChange={(e) =>
                          setAddField("facebook", e.target.value)
                        }
                        data-role="modal-input"
                        className="smooth-input"
                      />
                    </div>
                    <div>
                      <label style={{ ...sx.fieldLabel, ...sx.fieldLabelOpt }}>
                        LinkedIn link (optional)
                      </label>
                      <input
                        style={sx.modalInput}
                        placeholder="https://linkedin.com/in/yourname"
                        value={addForm.linkedin}
                        onChange={(e) =>
                          setAddField("linkedin", e.target.value)
                        }
                        data-role="modal-input"
                        className="smooth-input"
                      />
                    </div>
                  </div>

                  {/* ===== Section 2: Location + Blood ===== */}
                  <div style={sx.modalSectionTitle}>Location &amp; Blood</div>

                  <div style={sx.modalRow2}>
                    <div>
                      <label style={sx.fieldLabel}>Current Address *</label>
                      <input
                        style={{
                          ...sx.modalInput,
                          ...(formErrors.currentAddress
                            ? sx.modalInputError
                            : null),
                        }}
                        placeholder="Mirpur, Dhaka"
                        value={addForm.currentAddress}
                        onChange={(e) =>
                          setAddField("currentAddress", e.target.value)
                        }
                        data-role="modal-input"
                        className="smooth-input"
                      />
                    </div>
                    <div>
                      <label style={sx.fieldLabel}>Hometown *</label>
                      <input
                        style={{
                          ...sx.modalInput,
                          ...(formErrors.hometown ? sx.modalInputError : null),
                        }}
                        placeholder="Narsingdi"
                        value={addForm.hometown}
                        onChange={(e) =>
                          setAddField("hometown", e.target.value)
                        }
                        data-role="modal-input"
                        className="smooth-input"
                      />
                    </div>
                  </div>

                  <div>
                    <label style={sx.fieldLabel}>Blood Group *</label>
                    <select
                      style={{
                        ...sx.modalInput,
                        ...(formErrors.bloodGroup ? sx.modalInputError : null),
                      }}
                      value={addForm.bloodGroup}
                      onChange={(e) =>
                        setAddField("bloodGroup", e.target.value)
                      }
                      data-role="modal-input"
                      className="smooth-input"
                    >
                      <option value="">Select blood group…</option>
                      {BLOOD_OPTIONS.map((bg) => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* ===== Section 3: Current Position ===== */}
                  <div style={sx.modalSectionTitle}>
                    Current Position / Designation
                  </div>
                  <div style={sx.modalRow2}>
                    <div>
                      <label style={sx.fieldLabel}>Mode *</label>
                      <select
                        style={{
                          ...sx.modalInput,
                          ...(formErrors.position ? sx.modalInputError : null),
                        }}
                        value={addPosMode}
                        onChange={(e) => {
                          setAddPosMode(e.target.value);
                        }}
                        data-role="modal-input"
                        className="smooth-input"
                      >
                        <option value="">Select…</option>
                        {POSITION_OPTIONS.map((po) => (
                          <option key={po} value={po}>
                            {po}
                          </option>
                        ))}
                      </select>
                      <div style={sx.modalSubHint}>
                        Choosing <b>Student</b> or <b>None</b> will hide the
                        Company / Field / Experience / Skills fields below.
                        Choosing <b>Type</b> lets you type a custom title.
                      </div>
                    </div>
                    {addPosMode === "Type" && (
                      <div>
                        <label style={sx.fieldLabel}>Designation *</label>
                        <input
                          style={{
                            ...sx.modalInput,
                            ...(formErrors.position
                              ? sx.modalInputError
                              : null),
                          }}
                          placeholder="e.g. Junior Engineer, Lecturer…"
                          value={addForm.positionCustom}
                          onChange={(e) =>
                            setAddField("positionCustom", e.target.value)
                          }
                          data-role="modal-input"
                          className="smooth-input"
                        />
                      </div>
                    )}
                  </div>

                  {/* ===== Section 4: Career (only if NOT Student / None) ===== */}
                  {!hideCompanyBlock && (
                    <>
                      <div style={sx.modalSectionTitle}>
                        Career &amp; Skills
                      </div>
                      <div>
                        <label style={sx.fieldLabel}>
                          Company / Organization / University *
                        </label>
                        <input
                          style={{
                            ...sx.modalInput,
                            ...(formErrors.company ? sx.modalInputError : null),
                          }}
                          placeholder="DPHE / BUET / Padma Group…"
                          value={addForm.company}
                          onChange={(e) =>
                            setAddField("company", e.target.value)
                          }
                          data-role="modal-input"
                          className="smooth-input"
                        />
                      </div>
                      <div>
                        <label style={sx.fieldLabel}>
                          Field of Work / Higher Studies *
                        </label>
                        <input
                          style={{
                            ...sx.modalInput,
                            ...(formErrors.field ? sx.modalInputError : null),
                          }}
                          placeholder="Electrical Design / MSc in Power System…"
                          value={addForm.field}
                          onChange={(e) => setAddField("field", e.target.value)}
                          data-role="modal-input"
                          className="smooth-input"
                        />
                      </div>
                      <div>
                        <label style={sx.fieldLabel}>
                          Previously Experienced Companies / Organizations (if
                          any) *
                        </label>
                        <textarea
                          style={{
                            ...sx.modalInput,
                            ...sx.modalTextarea,
                            ...(formErrors.previousExperience
                              ? sx.modalInputError
                              : null),
                          }}
                          placeholder="Ahmed Group, DESCO, … (comma / newline separated)"
                          value={addForm.previousExperience}
                          onChange={(e) =>
                            setAddField("previousExperience", e.target.value)
                          }
                          className="smooth-input"
                        />
                      </div>
                      <div>
                        <label style={sx.fieldLabel}>
                          Skills / Areas of Expertise *
                        </label>
                        <textarea
                          style={{
                            ...sx.modalInput,
                            ...sx.modalTextarea,
                            ...(formErrors.skills ? sx.modalInputError : null),
                          }}
                          placeholder="AutoCAD Electrical, PLC Programming, Power System Analysis, Python…"
                          value={addForm.skills}
                          onChange={(e) =>
                            setAddField("skills", e.target.value)
                          }
                          className="smooth-input"
                        />
                      </div>
                    </>
                  )}

                  {hideCompanyBlock && (
                    <div
                      style={{
                        ...sx.messageInfo,
                        padding: "14px 16px",
                        margin: "6px 0 0",
                        fontSize: 13,
                        borderRadius: 12,
                      }}
                    >
                      ✅ Position set to <b>{posValue || "(select a mode)"}</b>{" "}
                      — career info fields are skipped for this entry.
                    </div>
                  )}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  justifyContent: "flex-end",
                  paddingTop: 6,
                  borderTop: `1px solid ${border}`,
                  marginTop: 4,
                }}
              >
                <button
                  style={sx.ghostBtn}
                  data-role="ghost-btn"
                  onClick={() => setShowAdd(false)}
                  className="smooth-btn"
                >
                  Cancel
                </button>
                <button
                  style={sx.primaryBtn}
                  data-role="primary-btn"
                  disabled={adding}
                  onClick={addAlumni}
                  className="smooth-btn primary-btn-glow"
                >
                  {adding ? "Adding…" : "Add Alumni"}
                </button>
              </div>
            </div>
          </div>
        )}

        <footer
          style={sx.footer}
          data-role="footer"
          onClick={() => setShowProfile(false)}
          className="footer-slide"
        >
          <span style={{ width: 48 }}></span>
          <span style={sx.footerText} data-role="footer-text">
            Developed by Hasibul Hassan Mobin. All rights reserved.
          </span>
          <div
            style={{ position: "relative", width: 48 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowProfile((v) => !v)}
              title="Developer Profile"
              style={sx.avatarBtn}
              data-role="avatar-btn"
              className="avatar-smooth"
            >
              <div style={sx.avatarPlaceholder}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="#bdbdbd">
                  <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5z" />
                </svg>
              </div>
            </button>

            {showProfile && (
              <div
                style={sx.profilePopup}
                data-role="profile-popup"
                onClick={(e) => e.stopPropagation()}
                className="profile-pop"
              >
                <div style={sx.profilePic} data-role="profile-pic">
                  <img
                    src={profilePicSrc}
                    alt="Hasibul Hassan Mobin"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: "50%",
                    }}
                  />
                </div>
                <div style={sx.profileName}>Hasibul Hassan Mobin</div>
                <div style={sx.socialRow}>
                  <a
                    href="https://www.facebook.com/hasibulhassanmobin/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={sx.socialBtn}
                    data-role="social-btn"
                    title="Facebook"
                    className="social-smooth"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="#1877F2"
                      aria-hidden
                    >
                      <path d="M13.5 21V14H16L16.5 10.5H13.5V8.5C13.5 7.53 13.77 6.9 15.06 6.9H16.5V3.6C16.25 3.56 15.4 3.5 14.36 3.5C12.22 3.5 10.8 4.8 10.8 7.26V10.5H8V14H10.8V21H13.5Z" />
                    </svg>
                  </a>
                  <a
                    href="https://www.linkedin.com/in/md-hasibul-hassan-mobin-0047a724b/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={sx.socialBtn}
                    data-role="social-btn"
                    title="LinkedIn"
                    className="social-smooth"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="#0A66C2"
                      aria-hidden
                    >
                      <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6C1.12 6 0 4.88 0 3.5C0 2.12 1.12 1 2.5 1C3.87 1 4.98 2.12 4.98 3.5ZM0.24 8H4.76V23H0.24V8ZM8.16 8H12.46V10.18H12.52C13.12 9.04 14.58 7.9 16.94 7.9C21.9 7.9 23 11.18 23 15.58V23H18.5V16.34C18.5 14.16 18.12 12.54 16.9 12.54C15.42 12.54 14.46 13.68 14.46 15.36V23H10V8H8.16Z" />
                    </svg>
                  </a>
                  <a
                    href="https://adek007.github.io/mobin/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={sx.socialBtn}
                    data-role="social-btn"
                    title="Website"
                    className="social-smooth"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#6C5CE7"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M2 12h20" />
                      <path d="M12 2C14.5 5.5 15.5 8.5 15.5 12C15.5 15.5 14.5 18.5 12 22C9.5 18.5 8.5 15.5 8.5 12C8.5 8.5 9.5 5.5 12 2Z" />
                    </svg>
                  </a>
                </div>
              </div>
            )}
          </div>
        </footer>
      </div>
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
    fontFamily:
      "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    padding: "36px 20px 110px",
    position: "relative",
    overflowX: "hidden",
  },
  content: {
    maxWidth: 1020,
    margin: "0 auto",
    position: "relative",
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
    background: "rgba(0,0,0,0.65)",
    display: "grid",
    placeItems: "center",
    zIndex: 50,
    padding: "20px 0",
    overflowY: "auto",
  },
  modal: {
    width: "min(680px, 94vw)",
    maxHeight: "calc(100vh - 40px)",
    display: "flex",
    flexDirection: "column",
    background: cardBg,
    border: `1px solid ${border}`,
    borderRadius: 18,
    padding: 22,
    boxShadow: "0 18px 60px rgba(0,0,0,0.6)",
    overflow: "hidden",
  },
  modalInner: {
    overflowY: "auto",
    paddingRight: 4,
    marginTop: 10,
    marginBottom: 8,
  },
  modalBody: {
    margin: "10px 0 16px",
    display: "grid",
    gap: 14,
  },
  modalSectionTitle: {
    margin: "8px 2px 2px",
    fontSize: 13,
    fontWeight: 700,
    color: textDim,
    letterSpacing: "0.3px",
    textTransform: "uppercase",
  },
  modalRow2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  modalInput: {
    minHeight: 44,
    background: "#121318",
    border: `1px solid ${border}`,
    color: text,
    borderRadius: 10,
    padding: "10px 12px",
    outline: "none",
    fontSize: 14,
    fontFamily: "inherit",
    boxSizing: "border-box",
    width: "100%",
  },
  modalInputError: {
    borderColor: "#d64545 !important",
    boxShadow: "0 0 0 2px rgba(214,69,69,0.15)",
  },
  modalTextarea: {
    resize: "vertical",
    minHeight: 78,
  },
  fieldLabel: {
    display: "block",
    fontSize: 12.5,
    fontWeight: 600,
    color: textDim,
    marginBottom: 5,
    paddingLeft: 2,
  },
  fieldLabelOpt: {
    color: "#7e808a",
    fontWeight: 500,
  },
  modalHeaderWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalSubHint: {
    fontSize: 12,
    color: textDim,
    marginTop: 2,
    paddingLeft: 2,
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
    transition:
      "transform 0.12s ease, border-color 0.12s ease, background 0.12s ease",
  },
};
