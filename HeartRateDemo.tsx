"use client";

import React from "react";

export function HeartRateDemo() {
  const bpm = 78;

  return (
    <div className="hr-wrap">
      <div className="hr-shell">
        <div className="hr-card">
          <p className="hr-title">Heart Rate</p>
          <div className="hr-orbit">
            <div className="hr-ring hr-ring-a" />
            <div className="hr-ring hr-ring-b" />
            <div className="hr-core">
              <span className="hr-number">{bpm}</span>
              <span className="hr-unit">BPM</span>
            </div>
          </div>
          <p className="hr-status">Live monitoring simulation</p>
        </div>
      </div>

      <style jsx>{`
        .hr-wrap {
          width: 100%;
          height: 100vh;
          min-height: 100vh;
          padding: 0;
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
        }

        .hr-shell {
          width: 100%;
          height: 100%;
          min-height: 100%;
          border-radius: 16px;
          background: #ffffff;
          display: grid;
          place-items: center;
          padding: 1.5rem;
          overflow: hidden;
        }

        .hr-card {
          width: min(420px, 100%);
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          background: #ffffff;
          padding: 2rem;
          box-shadow: none;
          text-align: center;
        }

        .hr-title {
          color: #0f172a;
          font-size: 1.5rem;
          font-weight: 650;
        }

        .hr-orbit {
          width: 240px;
          height: 240px;
          margin: 1.75rem auto 1.25rem;
          position: relative;
          display: grid;
          place-items: center;
        }

        .hr-ring {
          position: absolute;
          border-radius: 9999px;
          border: 2px solid #fb7185;
          opacity: 0.45;
        }

        .hr-ring-a {
          inset: 10px;
          animation: pulse-ring 1.8s ease-out infinite;
        }

        .hr-ring-b {
          inset: 0;
          animation: pulse-ring 1.8s ease-out 0.9s infinite;
        }

        .hr-core {
          width: 170px;
          height: 170px;
          border-radius: 9999px;
          background: radial-gradient(circle at 30% 25%, #fb7185 0%, #f43f5e 55%, #e11d48 100%);
          color: #fff;
          display: grid;
          place-content: center;
          gap: 0.15rem;
          box-shadow: 0 18px 38px rgba(244, 63, 94, 0.45);
          animation: heartbeat 1.1s ease-in-out infinite;
        }

        .hr-number {
          font-size: 3rem;
          line-height: 1;
          font-weight: 700;
          letter-spacing: -0.04em;
        }

        .hr-unit {
          font-size: 0.85rem;
          font-weight: 550;
          letter-spacing: 0.18em;
        }

        .hr-status {
          color: #64748b;
          font-size: 0.875rem;
        }

        @keyframes heartbeat {
          0%,
          100% {
            transform: scale(1);
          }
          20% {
            transform: scale(1.07);
          }
          38% {
            transform: scale(0.98);
          }
          52% {
            transform: scale(1.1);
          }
          70% {
            transform: scale(1);
          }
        }

        @keyframes pulse-ring {
          0% {
            transform: scale(0.85);
            opacity: 0.5;
          }
          100% {
            transform: scale(1.16);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

export default HeartRateDemo;
