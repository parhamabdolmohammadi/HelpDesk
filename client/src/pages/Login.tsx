import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import { signIn, useSession } from "../lib/auth-client";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export function Login() {
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  if (!isPending && session) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async ({ email, password }: LoginForm) => {
    setFormError(null);

    const { error: signInError } = await signIn.email({ email, password });

    if (signInError) {
      setFormError(signInError.message ?? "Invalid email or password");
      return;
    }

    navigate("/", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
      >
        <h1 className="mb-4 text-lg font-semibold text-gray-900">Sign in</h1>

        {formError && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </div>
        )}

        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-gray-700">Email</span>
          <input
            type="email"
            autoComplete="email"
            {...register("email")}
            className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none ${
              errors.email ? "border-red-500 focus:border-red-500" : "border-gray-300 focus:border-gray-500"
            }`}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </label>

        <label className="mb-4 block text-sm">
          <span className="mb-1 block text-gray-700">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            {...register("password")}
            className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none ${
              errors.password ? "border-red-500 focus:border-red-500" : "border-gray-300 focus:border-gray-500"
            }`}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">
              {errors.password.message}
            </p>
          )}
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
