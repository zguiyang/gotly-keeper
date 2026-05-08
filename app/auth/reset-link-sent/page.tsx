import { CheckCircle } from "lucide-react";
import Link from "next/link";

import { AuthStatusView } from "@/components/auth/auth-card";
import { AuthPageScaffold } from "@/components/auth/auth-page-scaffold";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ResetLinkSentPage() {
  return (
    <AuthPageScaffold
      mainClassName="flex flex-1 items-center justify-center px-6 py-12 sm:py-16"
      withFooter={false}
    >
      <AuthStatusView
        title="链接已发送"
        description="重置密码链接已发送至你的邮箱，请注意查收。"
        icon={<CheckCircle className="size-7" strokeWidth={1.8} />}
        action={
          <Link
            className={cn(buttonVariants({ size: "lg" }), "h-10 w-full rounded-xl text-sm")}
            href="/auth/sign-in"
          >
            回到登录
          </Link>
        }
        secondaryAction={
          <p className="font-body text-sm text-on-surface-variant">
            没有收到邮件？
            <Button
              type="button"
              variant="link"
              className="ml-1 h-auto px-0 text-sm"
            >
              重新发送
            </Button>
          </p>
        }
      />
    </AuthPageScaffold>
  );
}
