import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { createTicketSchema, type CreateTicketInput } from "core";
import { Send, Sparkles, Ticket, Wand2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { useSession } from "../lib/auth-client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function SubmitTicketCard() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const displayName = session?.user.name || session?.user.email;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateTicketInput>({ resolver: zodResolver(createTicketSchema) });

  const body = watch("body");

  const { mutate, isPending, isSuccess, isError, data, reset: resetMutation } = useMutation({
    mutationFn: async (values: CreateTicketInput) => {
      const response = await axios.post("/api/tickets", values, {
        withCredentials: true,
      });
      return response.data.ticket as { id: string };
    },
    onSuccess: () => {
      // Matches ["tickets", "mine"] too — invalidateQueries defaults to a
      // prefix match, so this covers MyTicketsList's query as well.
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-stats"] });
      reset();
    },
  });

  const {
    mutate: polishDescription,
    isPending: isPolishingDescription,
    isError: isPolishDescriptionError,
  } = useMutation({
    mutationFn: async (draft: string) => {
      const response = await axios.post<{ polished: string }>(
        "/api/tickets/polish-description",
        { body: draft },
        { withCredentials: true },
      );
      return response.data.polished;
    },
    onSuccess: (polished) => setValue("body", polished),
  });

  const {
    mutate: generateSubject,
    isPending: isGeneratingSubject,
    isError: isGenerateSubjectError,
  } = useMutation({
    mutationFn: async (description: string) => {
      const response = await axios.post<{ subject: string }>(
        "/api/tickets/generate-subject",
        { body: description },
        { withCredentials: true },
      );
      return response.data.subject;
    },
    onSuccess: (subject) => setValue("subject", subject),
  });

  const onSubmit = (values: CreateTicketInput) => {
    resetMutation();
    mutate(values);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Ticket className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Submit a Ticket</CardTitle>
        </div>
        <CardDescription>Describe your issue and we'll take care of the rest.</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <CardContent className="grid gap-4">
          {isError && (
            <Alert variant="destructive">
              <AlertDescription>Failed to submit ticket</AlertDescription>
            </Alert>
          )}

          {isSuccess && data && (
            <Alert>
              <AlertDescription>
                Ticket submitted.{" "}
                <Link to={`/tickets/${data.id}`} className="font-medium underline">
                  View it
                </Link>
                .
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="requesterName">Your name</Label>
              <Input id="requesterName" value={displayName ?? ""} disabled readOnly />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="requesterEmail">Your email</Label>
              <Input
                id="requesterEmail"
                type="email"
                value={session?.user.email ?? ""}
                disabled
                readOnly
              />
            </div>
          </div>

          {isGenerateSubjectError && (
            <Alert variant="destructive">
              <AlertDescription>Failed to generate subject</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Can't log in to my account"
              disabled={isGeneratingSubject}
              aria-invalid={!!errors.subject}
              {...register("subject")}
            />
            {errors.subject && (
              <p className="text-sm text-destructive">{errors.subject.message}</p>
            )}
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!body?.trim() || isGeneratingSubject}
                onClick={() => generateSubject(body)}
              >
                <Wand2 className="h-3.5 w-3.5" />
                {isGeneratingSubject ? "Generating…" : "Generate from description"}
              </Button>
            </div>
          </div>

          {isPolishDescriptionError && (
            <Alert variant="destructive">
              <AlertDescription>Failed to polish description</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="body">Description</Label>
            <Textarea
              id="body"
              rows={4}
              placeholder="Describe the issue in as much detail as possible…"
              disabled={isPolishingDescription}
              aria-invalid={!!errors.body}
              {...register("body")}
            />
            {errors.body && <p className="text-sm text-destructive">{errors.body.message}</p>}
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!body?.trim() || isPolishingDescription}
                onClick={() => polishDescription(body)}
              >
                <Sparkles className="h-3.5 w-3.5" />
                {isPolishingDescription ? "Polishing…" : "Polish"}
              </Button>
            </div>
          </div>
        </CardContent>

        <CardFooter className="justify-end">
          <Button type="submit" disabled={isPending}>
            <Send className="h-4 w-4" />
            {isPending ? "Submitting…" : "Submit ticket"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
