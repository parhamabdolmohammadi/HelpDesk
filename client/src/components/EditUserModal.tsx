import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { updateUserSchema, type UpdateUserInput } from "core";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserFormFields } from "@/components/UserFormFields";
import type { UserListItem } from "@/components/UsersTable";

type EditUserModalProps = {
  user: UserListItem;
};

export function EditUserModal({ user }: EditUserModalProps) {
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: { name: user.name ?? "", email: user.email, password: "" },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (values: UpdateUserInput) => {
      const response = await axios.patch(`/api/users/${user.id}`, values, {
        withCredentials: true,
      });
      return response.data.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setOpen(false);
    },
    onError: (error) => {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.message ?? "Failed to update user")
        : "Failed to update user";
      setFormError(message);
    },
  });

  const onSubmit = (values: UpdateUserInput) => {
    setFormError(null);
    mutate(values);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        setFormError(null);
        if (nextOpen) {
          reset({ name: user.name ?? "", email: user.email, password: "" });
        } else {
          reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Edit ${user.name ?? user.email}`}
        >
          <Pencil />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
        </DialogHeader>

        <form
          id="edit-user-form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="grid gap-4"
        >
          {formError && (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <UserFormFields
            register={register}
            errors={errors}
            passwordAutoComplete="new-password"
            passwordHint="Leave blank to keep the current password"
          />
        </form>

        <DialogFooter>
          <Button type="submit" form="edit-user-form" disabled={isPending}>
            {isPending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
