import { Link, type LinkProps } from "react-router-dom";
import { cn } from "cn";

export function TextLink({ className, ...props }: LinkProps) {
  return <Link className={cn("text-foreground hover:underline", className)} {...props} />;
}
