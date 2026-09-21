"use client";

import type {
  ClipboardEvent,
  Dispatch,
  FocusEvent,
  FormEvent,
  HTMLInputTypeAttribute,
  InputHTMLAttributes,
  KeyboardEvent,
  MutableRefObject,
  SetStateAction,
} from "react";
import { forwardRef, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  Button,
  IconOnlyButton,
  TextButton,
  TextOnlyButton,
} from "@/components/common/buttons";
import LogoHorizontalM from "@/components/common/logo/horizontal/m";
import LogoVerticalM from "@/components/common/logo/vertical/m";
import { Tooltip } from "@/components/common/tooltip";
import { ROUTES } from "@/constants/routes";
import {
  AuthApiError,
  confirmEmailVerification,
  getGoogleAuthorizationUrl,
  loginWithEmail,
  saveAuthTokens,
  sendEmailVerification,
  signupWithEmail,
} from "@/lib/auth";
import {
  ANALYTICS_EVENTS,
  resolveLoginReferrer,
  track,
} from "@/lib/analytics";
import { shouldShowDesktopRequiredPage } from "@/utils/device";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d).{8,20}$/;
const passwordValidationMessage = "영문, 숫자 조합 8자 이상인지 확인해주세요";
const passwordMaxLengthMessage = "비밀번호는 최대 20자까지만 가능합니다";
const passwordMismatchMessage = "비밀번호가 일치하지 않습니다";
const verificationCodeLength = 6;
const initialVerificationCode = Array(verificationCodeLength).fill("");
const defaultVerificationErrorMessage = "인증번호를 다시 확인해주세요.";
const loginValidationErrorMessage = "이메일과 비밀번호를 확인해주세요";
const authInputLabelClass =
  "text-sub14-reg text-text-neutral-title [font-feature-settings:'liga'_off,'clig'_off]";
const authInputGapClass = "gap-1";

interface AuthInputProps {
  label?: string;
  required?: boolean;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  inputType?: HTMLInputTypeAttribute;
  name?: string;
  autoComplete?: string;
  maxLength?: number;
  disabled?: boolean;
  hasError?: boolean;
  error?: string;
  className?: string;
  gapClassName?: string;
  labelClassName?: string;
  type?: "ID" | "PASSWORD" | "EMAIL";
}

function InputMain({
  label,
  required,
  placeholder,
  value = "",
  onChange,
  onBlur,
  inputType,
  name,
  autoComplete,
  maxLength,
  disabled = false,
  hasError = false,
  error,
  className,
  gapClassName = "gap-1.5",
  labelClassName,
  type,
}: AuthInputProps) {
  const [focused, setFocused] = useState(false);
  const isError = hasError || !!error;
  const resolvedInputType =
    inputType ?? (type === "PASSWORD" ? "password" : "text");

  return (
    <div className={clsx("flex flex-col", gapClassName, className)}>
      {label && (
        <span
          className={clsx(
            "text-label14-semibold text-text-neutral-title",
            labelClassName,
          )}
        >
          {label}
          {required && <span className="ml-0.5 text-text-system-fail">•</span>}
        </span>
      )}

      <div
        className={clsx(
          "flex h-12 items-center rounded-lg border px-4 py-3 transition-colors",
          disabled
            ? "border-line-neutral-default bg-transparent"
            : isError
              ? "border-line-system-fail-default bg-white"
              : focused
                ? "border-line-primary-default bg-white"
                : "border-line-neutral-default bg-white",
        )}
      >
        <input
          type={resolvedInputType}
          name={name}
          autoComplete={autoComplete}
          maxLength={maxLength}
          className={clsx(
            "min-w-0 flex-1 bg-transparent text-sub14-reg text-text-neutral-description outline-none placeholder:text-text-neutral-disabled caret-line-primary-strong [font-feature-settings:'liga'_off,'clig'_off]",
            disabled && "text-text-neutral-disabled",
          )}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          disabled={disabled}
        />
      </div>

      {error && (
        <span className="text-right text-cap12-med text-text-system-fail">
          {error}
        </span>
      )}
    </div>
  );
}

interface AuthSingleLineProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "disabled" | "className"
> {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  className?: string;
  wrapperClassName?: string;
  inputClassName?: string;
  focusedBorder?: string;
  paddingClass?: string;
  radiusClass?: string;
}

const InputSingleLine = forwardRef<HTMLInputElement, AuthSingleLineProps>(
  function InputSingleLine(
    {
      value = "",
      onChange,
      disabled = false,
      hasError = false,
      className,
      wrapperClassName,
      inputClassName,
      focusedBorder = "border-line-neutral-strong",
      paddingClass = "px-4 py-3",
      radiusClass = "rounded-lg",
      onFocus,
      onBlur,
      ...inputProps
    },
    ref,
  ) {
    const [focused, setFocused] = useState(false);
    const isActive = focused || value.length > 0;

    const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
      setFocused(true);
      onFocus?.(event);
    };

    const handleBlur = (event: FocusEvent<HTMLInputElement>) => {
      setFocused(false);
      onBlur?.(event);
    };

    return (
      <div className={clsx("flex flex-col gap-1.5 w-148", className)}>
        <div
          className={clsx(
            "border transition-colors",
            radiusClass,
            paddingClass,
            disabled
              ? "border-line-neutral-default bg-transparent"
              : hasError
                ? "border-line-system-fail-default bg-white"
                : isActive
                  ? `${focusedBorder} bg-white`
                  : "border-line-neutral-default bg-white",
            wrapperClassName,
          )}
        >
          <input
            ref={ref}
            className={clsx(
              "w-full bg-transparent text-sub14-reg text-text-neutral-description outline-none placeholder:text-text-neutral-disabled caret-line-primary-strong",
              disabled && "text-text-neutral-disabled",
              inputClassName,
            )}
            value={value}
            onChange={(event) => onChange?.(event.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            {...inputProps}
          />
        </div>
      </div>
    );
  },
);

export default function EmailLoginScreen() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<
    "login" | "signup" | "verify" | "success"
  >("login");
  const [showCreditTooltip, setShowCreditTooltip] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [verificationCode, setVerificationCode] = useState<string[]>(
    initialVerificationCode,
  );
  const [hasVerificationError, setHasVerificationError] = useState(false);
  const [verificationErrorMessage, setVerificationErrorMessage] = useState(
    defaultVerificationErrorMessage,
  );
  const [loginError, setLoginError] = useState(false);
  const [loginErrorMessage, setLoginErrorMessage] = useState(
    loginValidationErrorMessage,
  );
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);
  const [signupErrorMessage, setSignupErrorMessage] = useState("");
  const [isSignupSubmitting, setIsSignupSubmitting] = useState(false);
  const [isVerificationSubmitting, setIsVerificationSubmitting] =
    useState(false);
  const [isResendingVerificationCode, setIsResendingVerificationCode] =
    useState(false);
  const verificationInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const hasTrackedPageView = useRef(false);

  // toched 상태
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [passwordConfirmTouched, setPasswordConfirmTouched] = useState(false);

  const isLoginReady = email.length > 0 && password.length > 0;
  const hasSignupEmailValidationError =
    authMode === "signup" &&
    emailTouched &&
    email.length > 0 &&
    !emailPattern.test(email);
  const hasPasswordMaxLengthError = password.length > 20;
  const hasPasswordValidationError =
    passwordTouched &&
    password.length > 0 &&
    !hasPasswordMaxLengthError &&
    !passwordPattern.test(password);
  const passwordError = hasPasswordMaxLengthError
    ? passwordMaxLengthMessage
    : hasPasswordValidationError
      ? passwordValidationMessage
      : undefined;
  const hasPasswordMismatchError =
    passwordConfirmTouched &&
    passwordConfirm.length > 0 &&
    passwordConfirm !== password;
  const isSignupFilled =
    email.length > 0 && password.length > 0 && passwordConfirm.length > 0;
  const isSignupReady =
    emailPattern.test(email) &&
    passwordPattern.test(password) &&
    passwordConfirm === password;
  const isVerificationReady =
    !hasVerificationError && verificationCode.every(Boolean);
  const displayedVerificationEmail = email || "example@gmail.com";

  useEffect(() => {
    if (hasTrackedPageView.current) {
      return;
    }

    hasTrackedPageView.current = true;
    track(ANALYTICS_EVENTS.LOGIN_PAGE_VIEWED, {
      referrer: resolveLoginReferrer(
        new URLSearchParams(window.location.search).get("redirect"),
      ),
    });
  }, []);

  useEffect(() => {
    if (authMode === "signup") {
      track(ANALYTICS_EVENTS.SIGNUP_PAGE_VIEWED);
    }
  }, [authMode]);

  useEffect(() => {
    if (!showCreditTooltip) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setShowCreditTooltip(false);
    }, 5000);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [showCreditTooltip]);

  const hideCreditTooltip = () => {
    setShowCreditTooltip(false);
  };

  const handleInputChange = (
    value: string,
    setter: Dispatch<SetStateAction<string>>,
  ) => {
    setter(value);
    setEmailTouched(false);
    setLoginError(false);
    setLoginErrorMessage(loginValidationErrorMessage);
    setSignupErrorMessage("");
    setVerificationErrorMessage(defaultVerificationErrorMessage);
    hideCreditTooltip();
  };

  const handlePasswordChange = (value: string) => {
    handleInputChange(value, setPassword);
    setPasswordConfirmTouched(false);

    if (value.length === 0) {
      setPasswordConfirm("");
    }
  };

  const handlePasswordConfirmChange = (value: string) => {
    handleInputChange(value, setPasswordConfirm);
    setPasswordConfirmTouched(false);
  };

  const focusVerificationInput = (index: number) => {
    verificationInputRefs.current[index]?.focus();
  };

  useEffect(() => {
    if (authMode !== "verify" || hasVerificationError) {
      return;
    }

    window.requestAnimationFrame(() => {
      focusVerificationInput(0);
    });
  }, [authMode, hasVerificationError]);

  const resetVerificationToInitial = () => {
    setVerificationCode([...initialVerificationCode]);
    setHasVerificationError(false);
    window.requestAnimationFrame(() => {
      focusVerificationInput(0);
    });
  };

  const fillVerificationCode = (startIndex: number, value: string) => {
    const digits = value.replace(/\D/g, "");

    if (!digits) {
      setVerificationCode((prevCode) =>
        prevCode.map((digit, index) => (index === startIndex ? "" : digit)),
      );
      return;
    }

    const nextCode = [...verificationCode];
    const slicedDigits = digits.slice(0, verificationCodeLength - startIndex);

    slicedDigits.split("").forEach((digit, offset) => {
      nextCode[startIndex + offset] = digit;
    });

    setVerificationCode(nextCode);

    const nextIndex = Math.min(
      startIndex + slicedDigits.length,
      verificationCodeLength - 1,
    );
    window.requestAnimationFrame(() => {
      focusVerificationInput(nextIndex);
    });
  };

  const handleVerificationCodeChange = (index: number, value: string) => {
    if (hasVerificationError) {
      resetVerificationToInitial();
      return;
    }

    fillVerificationCode(index, value);
  };

  const handleVerificationCodeFocus = () => {
    if (hasVerificationError) {
      resetVerificationToInitial();
    }
  };

  const handleVerificationCodeKeyDown = (
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Backspace" && !verificationCode[index] && index > 0) {
      focusVerificationInput(index - 1);
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusVerificationInput(index - 1);
      return;
    }

    if (event.key === "ArrowRight" && index < verificationCodeLength - 1) {
      event.preventDefault();
      focusVerificationInput(index + 1);
    }
  };

  const handleVerificationCodePaste = (
    index: number,
    event: ClipboardEvent<HTMLInputElement>,
  ) => {
    event.preventDefault();
    fillVerificationCode(index, event.clipboardData.getData("text"));
  };

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isLoginSubmitting) {
      return;
    }

    track(ANALYTICS_EVENTS.LOGIN_SUBMITTED, { login_method: "email" });

    if (
      !isLoginReady ||
      !emailPattern.test(email) ||
      !passwordPattern.test(password)
    ) {
      setLoginError(true);
      setLoginErrorMessage(loginValidationErrorMessage);
      track(ANALYTICS_EVENTS.LOGIN_FAILED, {
        login_method: "email",
        error_message: loginValidationErrorMessage,
      });
      return;
    }

    setLoginError(false);
    setIsLoginSubmitting(true);
    hideCreditTooltip();

    try {
      const tokens = await loginWithEmail({ email, password });
      saveAuthTokens(tokens, email);
      track(ANALYTICS_EVENTS.LOGIN_COMPLETED, { login_method: "email" });
      router.push(
        shouldShowDesktopRequiredPage()
          ? ROUTES.DESKTOP_REQUIRED
          : ROUTES.HOME,
      );
    } catch (error) {
      const errorMessage =
        error instanceof AuthApiError
          ? error.errorDetail || error.message
          : "로그인 중 문제가 발생했습니다.";

      setLoginError(true);
      setLoginErrorMessage(errorMessage);
      track(ANALYTICS_EVENTS.LOGIN_FAILED, {
        login_method: "email",
        error_message: errorMessage,
      });
    } finally {
      setIsLoginSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    track(ANALYTICS_EVENTS.GOOGLE_LOGIN_CLICKED);
    window.location.assign(getGoogleAuthorizationUrl());
  };

  const handleSignupSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setEmailTouched(true);
    setPasswordTouched(true);
    setPasswordConfirmTouched(true);

    if (isSignupSubmitting || !isSignupReady || !emailPattern.test(email)) {
      return;
    }

    setSignupErrorMessage("");
    setIsSignupSubmitting(true);
    track(ANALYTICS_EVENTS.SIGNUP_SUBMITTED);

    try {
      await sendEmailVerification({ email });
      setVerificationCode([...initialVerificationCode]);
      setHasVerificationError(false);
      setVerificationErrorMessage(defaultVerificationErrorMessage);
      setAuthMode("verify");
    } catch (error) {
      const errorMessage =
        error instanceof AuthApiError
          ? error.errorDetail || error.message
          : "인증번호 발송 중 문제가 발생했습니다.";

      setSignupErrorMessage(errorMessage);
      track(ANALYTICS_EVENTS.SIGNUP_FAILED, { error_message: errorMessage });
    } finally {
      setIsSignupSubmitting(false);
    }
  };

  const handleVerificationSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (isVerificationSubmitting || !isVerificationReady) {
      return;
    }

    setIsVerificationSubmitting(true);
    track(ANALYTICS_EVENTS.VERIFICATION_SUBMITTED);

    try {
      await confirmEmailVerification({
        email,
        code: verificationCode.join(""),
      });
      await signupWithEmail({
        email,
        password,
      });
      track(ANALYTICS_EVENTS.VERIFICATION_COMPLETED);
      setAuthMode("success");
      setVerificationCode([...initialVerificationCode]);
      setHasVerificationError(false);
      setVerificationErrorMessage(defaultVerificationErrorMessage);
    } catch (error) {
      const errorMessage =
        error instanceof AuthApiError
          ? error.errorDetail || error.message
          : defaultVerificationErrorMessage;

      setVerificationCode([...initialVerificationCode]);
      setHasVerificationError(true);
      setVerificationErrorMessage(errorMessage);
      track(ANALYTICS_EVENTS.VERIFICATION_FAILED, {
        error_message: errorMessage,
      });

      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    } finally {
      setIsVerificationSubmitting(false);
    }
  };

  const handleModeChange = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setLoginError(false);
    setSignupErrorMessage("");
    setVerificationErrorMessage(defaultVerificationErrorMessage);
    setEmail("");
    setPassword("");
    setPasswordConfirm("");
    setVerificationCode([...initialVerificationCode]);
    setHasVerificationError(false);
    setEmailTouched(false);
    setPasswordTouched(false);
    setPasswordConfirmTouched(false);
    hideCreditTooltip();
  };

  const handleVerificationSuccessConfirm = () => {
    handleModeChange("login");
  };

  const handleGoHome = () => {
    router.push(ROUTES.HOME);
  };

  const handleBackToSignup = () => {
    setAuthMode("signup");
    setVerificationCode([...initialVerificationCode]);
    setHasVerificationError(false);
    setVerificationErrorMessage(defaultVerificationErrorMessage);
    hideCreditTooltip();
  };

  const handleResendVerificationCode = async () => {
    if (isResendingVerificationCode) {
      return;
    }

    track(ANALYTICS_EVENTS.VERIFICATION_RESEND_CLICKED);
    resetVerificationToInitial();
    setVerificationErrorMessage(defaultVerificationErrorMessage);
    setIsResendingVerificationCode(true);

    try {
      await sendEmailVerification({ email });
    } catch (error) {
      setHasVerificationError(true);
      setVerificationErrorMessage(
        error instanceof AuthApiError
          ? error.errorDetail || error.message
          : "인증번호 재발송 중 문제가 발생했습니다.",
      );
    } finally {
      setIsResendingVerificationCode(false);
    }
  };

  if (authMode === "success") {
    return (
      <main className="flex min-h-screen w-full justify-center overflow-x-hidden bg-[linear-gradient(206deg,#F7F8FE_33.45%,#EEF1FF_83.74%)]">
        <section className="flex min-h-screen w-full flex-col items-center justify-center gap-20 self-stretch px-20 pt-20 pb-[120px] max-md:px-[var(--mobile-margin)]">
          <form noValidate>
            <EmailVerificationSuccessContent
              onConfirm={handleVerificationSuccessConfirm}
            />
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen w-full justify-center overflow-x-hidden bg-[linear-gradient(206deg,#F7F8FE_33.45%,#EEF1FF_83.74%)]">
      <div
        className={clsx(
          "flex w-full flex-col items-center pb-[219px] max-lg:pb-20 max-md:pb-10",
          authMode === "signup"
            ? "gap-[60px]"
            : authMode === "verify"
              ? "gap-[163.5px]"
              : "gap-32",
        )}
      >
        <header className="flex items-start justify-between self-stretch px-[82px] pt-10 pb-4 max-md:px-[var(--mobile-margin)] max-md:pt-6">
          <TextButton
            label="메인으로"
            size="large"
            styleType="primary"
            iconPosition="left"
            className="gap-2"
            onClick={handleGoHome}
          />
        </header>

        <section className="flex items-center justify-center self-stretch px-[82px] max-md:px-[var(--mobile-margin)]">
          {authMode === "verify" ? (
            <div className="flex items-center justify-center gap-6 self-stretch max-lg:flex-col">
              <BrandPanel />

              <form
                className="relative flex w-[440px] max-w-[calc(100vw-32px)] flex-col items-center justify-center rounded-card bg-bg-contents-default shadow-[0_0_24px_0_var(--color-bg-shadow-default)]"
                noValidate
                onSubmit={handleVerificationSubmit}
              >
                <EmailVerificationContent
                  email={displayedVerificationEmail}
                  verificationCode={verificationCode}
                  verificationInputRefs={verificationInputRefs}
                  hasVerificationError={hasVerificationError}
                  verificationErrorMessage={verificationErrorMessage}
                  isVerificationReady={isVerificationReady}
                  isSubmitting={isVerificationSubmitting}
                  isResending={isResendingVerificationCode}
                  onBack={handleBackToSignup}
                  onCodeChange={handleVerificationCodeChange}
                  onCodeFocus={handleVerificationCodeFocus}
                  onCodeKeyDown={handleVerificationCodeKeyDown}
                  onCodePaste={handleVerificationCodePaste}
                  onResend={handleResendVerificationCode}
                />
              </form>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-6 self-stretch max-lg:flex-col">
              <BrandPanel />

              <form
                className="relative flex w-[440px] max-w-[calc(100vw-32px)] flex-col items-start gap-6 rounded-card bg-white px-10 pt-8 pb-10 shadow-[0_0_24px_0_var(--color-bg-shadow-default)]"
                noValidate
                onSubmit={
                  authMode === "login" ? handleLoginSubmit : handleSignupSubmit
                }
              >
                <h1 className="text-t20-semibold text-center text-text-neutral-title [font-feature-settings:'liga'_off,'clig'_off]">
                  {authMode === "login" ? "로그인" : "회원가입"}
                </h1>

                {authMode === "login" ? (
                  <>
                    <div className="flex flex-col items-center gap-4 self-stretch">
                      <div className="flex flex-col items-start gap-[37px] self-stretch">
                        <div className="flex flex-col items-start gap-2 self-stretch">
                          <InputMain
                            name="email"
                            type="ID"
                            inputType="email"
                            autoComplete="email"
                            placeholder="아이디"
                            value={email}
                            disabled={isLoginSubmitting}
                            hasError={loginError}
                            className="self-stretch"
                            onChange={(value) =>
                              handleInputChange(value, setEmail)
                            }
                            onBlur={() => setEmailTouched(true)}
                          />
                          <InputMain
                            name="password"
                            type="PASSWORD"
                            inputType="password"
                            autoComplete="current-password"
                            placeholder="비밀번호"
                            value={password}
                            disabled={isLoginSubmitting}
                            error={loginError ? loginErrorMessage : undefined}
                            className="self-stretch"
                            onChange={handlePasswordChange}
                            onBlur={() => setPasswordTouched(true)}
                          />
                        </div>

                        <Button
                          label={isLoginSubmitting ? "로그인 중" : "로그인"}
                          styleType="primary"
                          size="large"
                          active={isLoginReady}
                          className="self-stretch"
                          disabled={!isLoginReady || isLoginSubmitting}
                          type="submit"
                        />
                      </div>

                      <AuthDivider />

                      <Button
                        label="Google 계정으로 계속하기"
                        styleType="quaternary"
                        size="large"
                        iconType="GOOGLE"
                        className="self-stretch"
                        onClick={handleGoogleLogin}
                      />
                    </div>

                    <footer className="mt-4 flex items-center justify-center gap-7 self-stretch">
                      <TextOnlyButton
                        label="비밀번호 재설정"
                        size="small"
                        styleType="secondary"
                      />
                      <TextOnlyButton
                        label="회원가입"
                        size="small"
                        styleType="primary"
                        onClick={() => handleModeChange("signup")}
                      />
                    </footer>
                  </>
                ) : (
                  <>
                    <div className="flex flex-col items-center gap-4 self-stretch">
                      <div className="flex flex-col items-start gap-4 self-stretch">
                        <div className="flex flex-col items-start gap-2 self-stretch">
                          <InputMain
                            label="이메일 주소"
                            name="signup-email"
                            type="EMAIL"
                            inputType="email"
                            autoComplete="email"
                            placeholder="이메일 주소를 입력해주세요."
                            value={email}
                            disabled={isSignupSubmitting}
                            hasError={
                              hasSignupEmailValidationError ||
                              Boolean(signupErrorMessage)
                            }
                            error={
                              signupErrorMessage
                                ? signupErrorMessage
                                : hasSignupEmailValidationError
                                  ? "이메일 형식이 맞지 않습니다."
                                  : undefined
                            }
                            className="self-stretch"
                            gapClassName={authInputGapClass}
                            labelClassName={authInputLabelClass}
                            onChange={(value) =>
                              handleInputChange(value, setEmail)
                            }
                          />
                          <InputMain
                            label="비밀번호"
                            name="signup-password"
                            type="PASSWORD"
                            inputType="password"
                            autoComplete="new-password"
                            placeholder="내용을 입력해주세요."
                            value={password}
                            disabled={isSignupSubmitting}
                            error={passwordError}
                            className="self-stretch"
                            gapClassName={authInputGapClass}
                            labelClassName={authInputLabelClass}
                            onChange={handlePasswordChange}
                            onBlur={() => setPasswordTouched(true)}
                          />
                          <InputMain
                            label="비밀번호 확인"
                            name="signup-password-confirm"
                            type="PASSWORD"
                            inputType="password"
                            autoComplete="new-password"
                            placeholder="내용을 입력해주세요."
                            value={passwordConfirm}
                            disabled={
                              password.length === 0 || isSignupSubmitting
                            }
                            error={
                              hasPasswordMismatchError
                                ? passwordMismatchMessage
                                : undefined
                            }
                            className="self-stretch"
                            gapClassName={authInputGapClass}
                            labelClassName={authInputLabelClass}
                            onChange={handlePasswordConfirmChange}
                            // onBlur={() => setPasswordConfirmTouched(true)}
                          />
                        </div>

                        <Button
                          label={
                            isSignupSubmitting ? "인증번호 발송 중" : "회원가입"
                          }
                          styleType="primary"
                          size="large"
                          active={isSignupFilled}
                          className="self-stretch"
                          disabled={!isSignupFilled || isSignupSubmitting}
                          type="submit"
                        />
                      </div>

                      <AuthDivider />

                      <Button
                        label="Google 계정으로 계속하기"
                        styleType="quaternary"
                        size="large"
                        iconType="GOOGLE"
                        className="self-stretch"
                        onClick={handleGoogleLogin}
                      />
                    </div>

                    <footer className="mt-4 flex items-center justify-center gap-3 self-stretch">
                      <span className="text-label14-med text-text-neutral-caption [font-feature-settings:'liga'_off,'clig'_off]">
                        이미 계정이 있으신가요?
                      </span>
                      <TextOnlyButton
                        label="로그인"
                        size="small"
                        styleType="primary"
                        onClick={() => handleModeChange("login")}
                      />
                    </footer>
                  </>
                )}

                {authMode === "login" && showCreditTooltip && (
                  <div className="pointer-events-none absolute right-[86px] bottom-[-16px]">
                    <Tooltip placement="up_mid" />
                  </div>
                )}
              </form>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function BrandPanel() {
  return (
    <aside className="flex w-[440px] max-w-[calc(100vw-32px)] flex-col items-center justify-center gap-12 self-stretch bg-transparent px-10 pt-0 pb-10 max-lg:self-auto max-md:px-4">
      <div className="flex flex-col items-center justify-center gap-4 self-stretch">
        <LogoVerticalM />

        <div className="flex flex-col items-center gap-2 self-stretch">
          <p className="text-t20-semibold text-center text-text-neutral-title [font-feature-settings:'liga'_off,'clig'_off]">
            인사담당자가 보는 내 자소서는 몇점?
          </p>
          <p className="text-sub14-med text-center text-text-neutral-caption [font-feature-settings:'liga'_off,'clig'_off]">
            내 경험을 살린 합격 자소서를 완성해보세요
          </p>
        </div>
      </div>
    </aside>
  );
}

interface EmailVerificationContentProps {
  email: string;
  verificationCode: string[];
  verificationInputRefs: MutableRefObject<Array<HTMLInputElement | null>>;
  hasVerificationError: boolean;
  verificationErrorMessage: string;
  isVerificationReady: boolean;
  isSubmitting: boolean;
  isResending: boolean;
  onBack: () => void;
  onCodeChange: (index: number, value: string) => void;
  onCodeFocus: () => void;
  onCodeKeyDown: (
    index: number,
    event: KeyboardEvent<HTMLInputElement>,
  ) => void;
  onCodePaste: (index: number, event: ClipboardEvent<HTMLInputElement>) => void;
  onResend: () => void;
}

function EmailVerificationContent({
  email,
  verificationCode,
  verificationInputRefs,
  hasVerificationError,
  verificationErrorMessage,
  isVerificationReady,
  isSubmitting,
  isResending,
  onBack,
  onCodeChange,
  onCodeFocus,
  onCodeKeyDown,
  onCodePaste,
  onResend,
}: EmailVerificationContentProps) {
  return (
    <>
      <div className="flex items-start gap-2.5 self-stretch px-7 pt-6">
        <IconOnlyButton
          iconType="ARROW_L"
          className="!h-[30px] !w-[30px]"
          aria-label="회원가입 화면으로 돌아가기"
          onClick={onBack}
        />
      </div>

      <div className="flex flex-col items-start self-stretch px-10 pb-10">
        <header className="flex flex-col items-center gap-6 self-stretch">
          <div className="flex flex-col items-center gap-2 self-stretch">
            <p className="text-t20-semibold text-center text-text-neutral-title [font-feature-settings:'liga'_off,'clig'_off]">
              이메일 인증하기
            </p>
            <div className="flex flex-col items-center">
              <p className="text-sub14-med text-center text-text-neutral-description [font-feature-settings:'liga'_off,'clig'_off]">
                {email}
              </p>
              <p className="text-sub14-med text-center text-text-neutral-caption [font-feature-settings:'liga'_off,'clig'_off]">
                (으)로 전송한 6자리 코드를 입력해주세요
              </p>
            </div>
          </div>
        </header>

        <div className="mt-9 flex flex-col items-center gap-3 self-stretch">
          <div className="flex items-start justify-center gap-3">
            {verificationCode.map((digit, index) => (
              <InputSingleLine
                key={index}
                ref={(input) => {
                  verificationInputRefs.current[index] = input;
                }}
                value={digit}
                onChange={(value) => onCodeChange(index, value)}
                onFocus={onCodeFocus}
                onKeyDown={(event) => onCodeKeyDown(index, event)}
                onPaste={(event) => onCodePaste(index, event)}
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                maxLength={1}
                disabled={isSubmitting}
                aria-label={`인증번호 ${index + 1}번째 자리`}
                className="!w-[47px] gap-0"
                wrapperClassName="h-[63px] w-[47px]"
                inputClassName="h-full text-center !text-[24px] !leading-[130%] !font-medium !tracking-[-0.02em] !text-text-neutral-description [font-feature-settings:'liga'_off,'clig'_off]"
                paddingClass="p-0"
                radiusClass="rounded-card-s"
                focusedBorder="border-line-primary-default"
                hasError={hasVerificationError}
              />
            ))}
          </div>

          {hasVerificationError && (
            <p className="text-cap12-med text-center text-text-system-fail [font-feature-settings:'liga'_off,'clig'_off]">
              {verificationErrorMessage}
            </p>
          )}
        </div>

        <div
          className={clsx(
            "mt-6 flex items-center justify-center gap-1 self-stretch",
            hasVerificationError && "hidden",
          )}
        >
          <span className="text-sub14-reg text-text-neutral-caption [font-feature-settings:'liga'_off,'clig'_off]">
            인증코드가 오지 않았나요?
          </span>
          <TextOnlyButton
            label={isResending ? "보내는 중" : "다시 보내기"}
            size="small"
            styleType="primary"
            disabled={isResending}
            onClick={onResend}
          />
        </div>

        <Button
          label={isSubmitting ? "처리 중" : "회원가입"}
          styleType="primary"
          size="large"
          active={isVerificationReady}
          disabled={!isVerificationReady || isSubmitting}
          className="mt-6 self-stretch"
          type="submit"
        />
      </div>
    </>
  );
}

interface EmailVerificationSuccessContentProps {
  onConfirm: () => void;
}

function EmailVerificationSuccessContent({
  onConfirm,
}: EmailVerificationSuccessContentProps) {
  return (
    <section className="flex w-[440px] max-w-[calc(100vw-32px)] flex-col items-center justify-center gap-9 rounded-card bg-bg-contents-default p-10 shadow-[0_0_24px_0_var(--color-bg-shadow-default)]">
      <div className="flex flex-col items-center gap-6 self-stretch">
        <LogoHorizontalM />

        <p className="text-t20-semibold text-center whitespace-pre-line text-[#2F2F37] tracking-[-0.4px] [font-feature-settings:'liga'_off,'clig'_off]">
          {"환영합니다.\n회원가입이 완료되었습니다!"}
        </p>
      </div>
      <Button
        label="확인"
        styleType="primary"
        size="large"
        className="self-stretch"
        onClick={onConfirm}
      />
    </section>
  );
}

function AuthDivider() {
  return (
    <div className="flex items-center justify-center gap-5 self-stretch">
      <span className="h-[0.75px] flex-1 bg-line-neutral-default" />
      <span className="flex items-center justify-center gap-2.5 text-cap12-med text-center text-text-neutral-caption [font-feature-settings:'liga'_off,'clig'_off]">
        또는
      </span>
      <span className="h-[0.75px] flex-1 bg-line-neutral-default" />
    </div>
  );
}
