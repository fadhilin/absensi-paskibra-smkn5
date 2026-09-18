"use client";

import { useState } from "react";

export function LoginPassword() {
  const [visible, setVisible] = useState(false);
  return (
    <div className="field">
      <label htmlFor="login-password">Kata sandi</label>
      <div className="login-password-control">
        <input
          id="login-password"
          name="password"
          type={visible ? "text" : "password"}
          autoComplete="current-password"
          placeholder="Masukkan kata sandi"
          required
        />
        <button
          type="button"
          className="login-password-toggle"
          aria-label={visible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          aria-controls="login-password"
          onClick={() => setVisible((current) => !current)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
            {visible && <path d="m3 3 18 18" />}
          </svg>
        </button>
      </div>
    </div>
  );
}
