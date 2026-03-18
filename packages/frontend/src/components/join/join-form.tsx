"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { validateSessionCode } from "@/actions/session";

const DIGIT_COUNT = 6;

interface JoinFormProps {
  locale: string;
  tagline: string;
  invalidCodeMessage: string;
  sessionEndedMessage: string;
  initialCode?: string;
}

export function JoinForm({
  locale,
  tagline,
  invalidCodeMessage,
  sessionEndedMessage,
  initialCode,
}: JoinFormProps) {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(Array(DIGIT_COUNT).fill(""));
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Deep-link: pre-fill and auto-submit if initialCode is a valid 6-digit string
  useEffect(() => {
    if (initialCode && /^\d{6}$/.test(initialCode)) {
      const prefilledDigits = initialCode.split("");
      setDigits(prefilledDigits);
      // Auto-submit after a short tick to allow state to settle
      const timer = setTimeout(() => {
        submitCode(initialCode);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [initialCode]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submitCode(code: string) {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await validateSessionCode(code);

      if (result === "valid") {
        router.push(`/${locale}/${code}`);
        return;
      }

      if (result === "ended") {
        setErrorMessage(sessionEndedMessage);
        setDigits(Array(DIGIT_COUNT).fill(""));
        setTimeout(() => inputRefs.current[0]?.focus(), 0);
      } else {
        // "invalid" — trigger shake animation
        setShake(true);
        setTimeout(() => {
          setShake(false);
          setDigits(Array(DIGIT_COUNT).fill(""));
          inputRefs.current[0]?.focus();
        }, 450);
        setErrorMessage(invalidCodeMessage);
      }
    } catch {
      setErrorMessage(invalidCodeMessage);
    } finally {
      setIsLoading(false);
    }
  }

  function handleChange(index: number, value: string) {
    if (isLoading) return;

    // Accept only a single digit
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setErrorMessage(null);

    if (digit && index < DIGIT_COUNT - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits are filled
    const filled = newDigits.every((d) => d !== "");
    if (filled) {
      submitCode(newDigits.join(""));
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (isLoading) return;

    if (e.key === "Backspace" && digits[index] === "") {
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    if (isLoading) return;
    e.preventDefault();

    const pasted = e.clipboardData.getData("text");

    // Try to extract 6-digit code from pasted content (including full URLs)
    let code: string | null = null;
    const urlMatch = pasted.match(/(\d{6})/);
    if (urlMatch) {
      code = urlMatch[1];
    }

    if (code && /^\d{6}$/.test(code)) {
      const pastedDigits = code.split("");
      setDigits(pastedDigits);
      setErrorMessage(null);
      // Focus last input
      inputRefs.current[DIGIT_COUNT - 1]?.focus();
      submitCode(code);
    } else {
      // Extract any digits from pasted content and fill from start
      const extractedDigits = pasted.replace(/\D/g, "").slice(0, DIGIT_COUNT).split("");
      const filledDigits = Array(DIGIT_COUNT)
        .fill("")
        .map((_, i) => extractedDigits[i] ?? "");
      setDigits(filledDigits);
      const nextEmpty = filledDigits.findIndex((d) => d === "");
      if (nextEmpty >= 0) {
        inputRefs.current[nextEmpty]?.focus();
      } else {
        inputRefs.current[DIGIT_COUNT - 1]?.focus();
        if (filledDigits.every((d) => d !== "")) {
          submitCode(filledDigits.join(""));
        }
      }
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-73px)] flex-col items-center justify-center px-6 py-12">
      {/* Ambient glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/3 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/8 blur-3xl" />
      </div>

      <div className="relative flex flex-col items-center gap-10">
        {/* Logo + brand */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10">
            <svg
              viewBox="100 85 824 855"
              className="h-9 w-auto text-indigo-500"
              fill="none"
              stroke="currentColor"
              strokeWidth={65}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M582.687,151.44c88.633,46.208 124.112,154.761 79.876,244.395c-51.925,105.214 -114.549,232.104 -139.582,282.828c-6.796,13.77 -20.916,22.393 -36.269,22.151c-53.688,-0.848 -182.101,-2.876 -273.696,-4.323c-22.082,-0.349 -42.459,-11.945 -54.037,-30.752c-11.578,-18.807 -12.754,-42.223 -3.12,-62.096c50.081,-103.308 132.337,-272.989 191.142,-394.294c18.364,-37.882 51.28,-66.717 91.248,-79.936c39.969,-13.219 83.586,-9.697 120.916,9.764c7.802,4.067 15.667,8.168 23.523,12.263Z" />
              <path d="M422.18,872.922c-89.217,-45.069 -126.083,-153.16 -82.998,-243.352c50.574,-105.87 111.568,-233.551 135.95,-284.592c6.619,-13.856 20.627,-22.659 35.983,-22.613c53.694,0.161 182.123,0.545 273.729,0.819c22.085,0.066 42.609,11.401 54.426,30.058c11.817,18.657 13.294,42.056 3.915,62.051c-48.754,103.941 -128.831,274.661 -186.078,396.708c-17.877,38.114 -50.421,67.368 -90.217,81.098c-39.796,13.73 -83.455,10.767 -121.031,-8.215c-7.853,-3.967 -15.771,-7.967 -23.678,-11.961Z" />
            </svg>
          </div>
          <span
            className="text-sm font-medium tracking-wide text-muted-foreground"
            aria-label={tagline}
          >
            {tagline}
          </span>
        </div>

        {/* OTP input row */}
        <div className="flex flex-col items-center gap-4">
          <motion.div
            className="flex items-center"
            animate={shake ? { x: [0, -10, 10, -10, 10, 0] } : { x: 0 }}
            transition={{ duration: 0.4 }}
            onAnimationComplete={() => setShake(false)}
          >
            {Array.from({ length: DIGIT_COUNT }).map((_, index) => (
              <div key={index} className={index === 3 ? "ml-4" : index > 0 ? "ml-2 sm:ml-3" : ""}>
                <input
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]"
                  maxLength={1}
                  value={digits[index]}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  disabled={isLoading}
                  aria-label={`Digit ${index + 1}`}
                  className="h-14 w-12 rounded-xl border-2 border-border bg-background text-center text-2xl font-bold text-foreground transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50 sm:h-16 sm:w-14"
                  style={{ caretColor: "transparent" }}
                />
              </div>
            ))}
          </motion.div>

          {/* Error message */}
          <div className="min-h-[1.5rem]" aria-live="polite" aria-atomic="true">
            {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
          </div>
        </div>

        {/* Loading indicator — subtle opacity, no spinner */}
        {isLoading && (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Checking code...
          </p>
        )}
      </div>
    </div>
  );
}
