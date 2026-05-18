import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { AnimatePresence, motion } from "framer-motion";
import {
  BadgeCheck,
  Clock3,
  FileSearch,
  Fingerprint,
  Search,
  ShieldAlert,
  UploadCloud
} from "lucide-react";

import { UploadCard } from "../components/UploadCard";
import { VerificationCard } from "../components/VerificationCard";
import { StatusBadge } from "../components/StatusBadge";
import { LoadingSpinner } from "../components/LoadingSpinner";

import { useAuth } from "../context/AuthContext";
import { useTrustChain } from "../context/TrustChainContext";

import { verificationService } from "../services/verificationService";
import {
  compactHash,
  formatDateTime
} from "../utils/format";

import type {
  VerificationRequest,
  VerificationResult
} from "../types/domain";

export const EmployerVerify = () => {

  const { user } = useAuth();

  const {
    requestVerification
  } = useTrustChain();

  const [tab, setTab] =
    useState<"enrollment" | "hash">(
      "enrollment"
    );

  const [
    enrollmentNumber,
    setEnrollmentNumber
  ] = useState(
    "NIDL-2021-CS-1042"
  );

  const [hash, setHash] =
    useState("");

  const [file, setFile] =
    useState<File | null>(
      null
    );

  const [
    studentEmail,
    setStudentEmail
  ] = useState("alex.jain@student.edu");

  const [
    pendingRequest,
    setPendingRequest
  ] = useState<
    VerificationRequest | null
  >(null);

  const [result, setResult] =
    useState<
      VerificationResult | null
    >(null);

  const [loading, setLoading] =
    useState(false);

  const [polling, setPolling] =
    useState(false);

  const hasStudentEmail = useMemo(
    () => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(studentEmail.trim()),
    [studentEmail]
  );

  const canDirectVerify =
    useMemo(
      () =>
        tab === "enrollment"
          ? Boolean(enrollmentNumber.trim())
          : Boolean(file || hash.trim()),
      [tab, enrollmentNumber, hash, file]
    );

  const canRequestConsent = hasStudentEmail;

  const requestConsent =
    async () => {

      if (!canRequestConsent || !user) {
        toast.error("Enter the student's Gmail/email before sending a consent request.");
        return;
      }

      setLoading(true);

      setResult(null);

      try {

        const request =
          await requestVerification({

            enrollmentNumber:
              tab ===
              "enrollment"
                ? enrollmentNumber
                : undefined,

            documentHash:
              tab === "hash"
                ? hash
                : undefined,

            studentEmail: studentEmail.trim().toLowerCase(),

            requesterEmail:
              user.email,

            requesterName:
              user.name,

            company:
              user.organization ||
              "Hiring Organization",

          });

        setPendingRequest(
          request
        );

        if (
          request.result &&
          request.status !==
            "pending"
        ) {

          setResult(
            request.result
          );

        }

        toast.success(
          "Student approval request sent."
        );

      } catch (caught) {

        toast.error(
          caught instanceof Error
            ? caught.message
            : "Unable to request verification."
        );

      } finally {

        setLoading(false);

      }

    };

  const verifyDirect =
    async () => {

      if (!canDirectVerify)
        return;

      setLoading(true);

      setPendingRequest(
        null
      );

      try {

        const nextResult =
          await verificationService.verify(
            tab === "hash"
              ? { documentHash: hash.trim(), file: file || undefined }
              : { enrollmentNumber: enrollmentNumber.trim() }
          );

        setResult(nextResult);

      } catch (caught) {

        toast.error(
          caught instanceof Error
            ? caught.message
            : "Verification failed."
        );

      } finally {

        setLoading(false);

      }

    };

  useEffect(() => {

    if (
      !pendingRequest ||
      pendingRequest.status !==
        "pending"
    )
      return;

    setPolling(true);

    const interval =
      window.setInterval(
        async () => {

          try {

            const latest =
              await verificationService.getRequest(
                pendingRequest.id
              );

            setPendingRequest(
              latest
            );

            if (
              latest.result &&
              latest.status !==
                "pending"
            ) {

              setResult(
                latest.result
              );

              window.clearInterval(
                interval
              );

              setPolling(
                false
              );

            }

          } catch {

            // silent

          }

        },
        5000
      );

    return () => {

      window.clearInterval(
        interval
      );

      setPolling(false);

    };

  }, [pendingRequest]);

  return (
    <div className="space-y-8">

      <div>

        <p className="text-sm uppercase tracking-[0.25em] text-blue-200">
          Employer Verification
        </p>

        <h1 className="mt-2 font-serif text-4xl font-bold text-white">
          Consent-based degree verification
        </h1>

        <p className="mt-2 max-w-3xl text-slate-400">
          Consent requests are routed by the student's Gmail/email. SHA-256 hash or file upload is used only for final tamper-proof verification.
        </p>

      </div>

      <div className="grid gap-7 xl:grid-cols-[.88fr_1.12fr]">

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-6 shadow-2xl backdrop-blur-xl">

          <div className="grid grid-cols-2 gap-3 rounded-3xl border border-white/10 bg-slate-950/60 p-2">

            <button
              onClick={() =>
                setTab(
                  "enrollment"
                )
              }
              className={`rounded-2xl px-4 py-3 font-bold ${
                tab ===
                "enrollment"
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:bg-white/10"
              }`}
            >
              Enrollment No.
            </button>

            <button
              onClick={() =>
                setTab("hash")
              }
              className={`rounded-2xl px-4 py-3 font-bold ${
                tab === "hash"
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:bg-white/10"
              }`}
            >
              Hash / Upload
            </button>

          </div>

          <AnimatePresence mode="wait">

            {tab ===
            "enrollment" ? (

              <motion.div
                key="enrollment"
                initial={{
                  opacity: 0,
                  y: 12
                }}
                animate={{
                  opacity: 1,
                  y: 0
                }}
                exit={{
                  opacity: 0,
                  y: -12
                }}
                className="mt-6"
              >

                <label className="text-sm font-semibold text-slate-300">
                  Enrollment Number
                </label>

                <div className="mt-2 flex gap-3">

                  <input
                    value={
                      enrollmentNumber
                    }
                    onChange={(e) =>
                      setEnrollmentNumber(
                        e.target.value
                      )
                    }
                    className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:ring-4 focus:ring-blue-400/20"
                  />

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-blue-200">
                    <Search className="h-6 w-6" />
                  </div>

                </div>

              </motion.div>

            ) : (

              <motion.div
                key="hash"
                initial={{
                  opacity: 0,
                  y: 12
                }}
                animate={{
                  opacity: 1,
                  y: 0
                }}
                exit={{
                  opacity: 0,
                  y: -12
                }}
                className="mt-6 space-y-5"
              >

                <UploadCard
                  title="Upload degree to verify"
                  subtitle="Drop a file and TrustChain computes SHA-256 locally."
                  onFileReady={(
                    nextFile,
                    nextHash
                  ) => {

                    setFile(
                      nextFile
                    );

                    setHash(
                      nextHash
                    );

                  }}
                />

                <label className="block text-sm font-semibold text-slate-300">
                  Or paste SHA-256 hash
                </label>

                <textarea
                  value={hash}
                  onChange={(e) =>
                    setHash(
                      e.target.value.trim()
                    )
                  }
                  rows={3}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 font-mono text-sm text-white outline-none focus:ring-4 focus:ring-blue-400/20"
                />

              </motion.div>

            )}

          </AnimatePresence>

          <label className="mt-6 block text-sm font-semibold text-slate-300">
            Student Gmail / Email required for consent request
          </label>

          <input
            value={studentEmail}
            onChange={(e) =>
              setStudentEmail(
                e.target.value
              )
            }
            placeholder="student@gmail.com"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:ring-4 focus:ring-blue-400/20"
          />

          <p className="mt-2 text-xs text-slate-500">
            Email decides which student's dashboard receives the request. Hash/file decides whether the document is authentic or tampered.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">

            <button
              disabled={
                !canRequestConsent ||
                loading
              }
              onClick={() =>
                void requestConsent()
              }
              className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-4 font-black text-white shadow-glow hover:bg-blue-500 disabled:opacity-50"
            >

              {loading
                ? (
                  <LoadingSpinner label="Sending" />
                )
                : (
                  <>
                    <Clock3 className="h-5 w-5" />
                    Request Student Approval
                  </>
                )}

            </button>

            <button
              disabled={
                !canDirectVerify ||
                loading
              }
              onClick={() =>
                void verifyDirect()
              }
              className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-5 py-4 font-black text-slate-200 hover:bg-white/10 disabled:opacity-50"
            >

              <FileSearch className="h-5 w-5" />
              Direct Verify API

            </button>

            <button
              disabled={!pendingRequest}
              onClick={async () => {

                if (
                  !pendingRequest
                )
                  return;

                try {

                  const latest =
                    await verificationService.getRequest(
                      pendingRequest.id
                    );

                  setPendingRequest(
                    latest
                  );

                  if (
                    latest.result
                  ) {

                    setResult(
                      latest.result
                    );

                    toast.success(
                      "Verification updated"
                    );

                  } else {

                    toast(
                      "Still pending student approval"
                    );

                  }

                } catch {

                  toast.error(
                    "Unable to fetch latest status"
                  );

                }

              }}
              className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-5 py-4 font-black text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-50"
            >

              <BadgeCheck className="h-5 w-5" />
              Check Verification Status

            </button>

          </div>

          <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/50 p-4">

            <div className="flex items-center gap-2 text-sm font-bold text-white">

              <Fingerprint className="h-5 w-5 text-blue-200" />
              Current fingerprint

            </div>

            <p className="mt-2 break-all font-mono text-xs text-slate-400">

              {tab === "hash"
                ? compactHash(
                    hash,
                    34,
                    28
                  )
                : enrollmentNumber ||
                  "No input yet"}

            </p>

          </div>

        </section>

        <section className="space-y-5">

          {result &&
            <VerificationCard result={result} />
          }

          {!pendingRequest &&
            !result && (

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl">

              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-500/10 text-blue-200">

                <UploadCloud className="h-10 w-10" />

              </div>

              <h2 className="mt-5 text-2xl font-black text-white">
                Ready for verification
              </h2>

            </div>

          )}

          {result?.status ===
            "tampered" && (

            <div className="rounded-[2rem] border border-red-300/20 bg-red-500/10 p-6 text-red-100 shadow-danger">

              <div className="flex gap-3">

                <ShieldAlert className="h-6 w-6" />

                <div>

                  <p className="font-black">
                    High-risk document warning
                  </p>

                </div>

              </div>

            </div>

          )}

        </section>

      </div>

    </div>
  );

};