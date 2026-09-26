import type { FieldErrors, Path, UseFormRegister } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type UserFormValues = {
  name: string;
  email: string;
  password?: string;
};

type UserFormFieldsProps<T extends UserFormValues> = {
  register: UseFormRegister<T>;
  errors: FieldErrors<T>;
  passwordAutoComplete: "new-password" | "current-password";
  passwordHint?: string;
};

export function UserFormFields<T extends UserFormValues>({
  register,
  errors,
  passwordAutoComplete,
  passwordHint,
}: UserFormFieldsProps<T>) {
  return (
    <>
      <div className="grid gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          autoComplete="name"
          aria-invalid={!!errors.name}
          {...register("name" as Path<T>)}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message as string}</p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          {...register("email" as Path<T>)}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message as string}</p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete={passwordAutoComplete}
          aria-invalid={!!errors.password}
          {...register("password" as Path<T>)}
        />
        {passwordHint && !errors.password && (
          <p className="text-sm text-muted-foreground">{passwordHint}</p>
        )}
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message as string}</p>
        )}
      </div>
    </>
  );
}
