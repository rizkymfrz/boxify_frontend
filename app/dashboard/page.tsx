"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { useAuthStore } from "@/lib/authStore";
import { useProjectsQuery } from "@/lib/projectQueries";
import type { ProjectListItem } from "@/lib/types";
import CreateProjectDialog from "@/components/dashboard/create-project-dialog";
import { Skeleton } from "@/components/ui/skeleton";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  IconPlus,
  IconFolder,
  IconPhoto,
  IconCheck,
  IconLogout,
  IconPhotoOff,
} from "@tabler/icons-react";

function ProjectCard({ project }: { project: ProjectListItem }) {
  const progress =
    project.image_count > 0
      ? Math.round((project.annotated_count / project.image_count) * 100)
      : 0;

  return (
    <Link href={`/editor?projectId=${project.id}`} className="group block">
      <Card className="h-full transition-all duration-200 hover:border-primary/50 hover:shadow-lg hover:shadow-black/10 hover:-translate-y-0.5">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="size-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <IconFolder className="size-4 text-primary" />
              </div>
              <CardTitle className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                {project.name}
              </CardTitle>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] shrink-0 tabular-nums"
            >
              #{project.id}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pb-4 space-y-4">
          {/* Stats row */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <IconPhoto className="size-3.5" />
              <span className="text-xs tabular-nums">
                {project.image_count} images
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <IconCheck className="size-3.5" />
              <span className="text-xs tabular-nums">
                {project.annotated_count} annotated
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground tabular-nums">
              {progress}% complete
            </p>
          </div>
        </CardContent>

        <CardFooter>
          <p className="text-[10px] text-muted-foreground">
            Created {format(new Date(project.created_at), "MMM d, yyyy")}
          </p>
        </CardFooter>
      </Card>
    </Link>
  );
}

export default function DashboardPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { data, isPending, isError } = useProjectsQuery();

  const projects = data?.projects ?? [];

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Subtle grid background */}
      <div
        className="fixed inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <Image
              src="/boxify.svg"
              alt="Boxify"
              width={36}
              height={36}
              className="size-9"
            />
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                Welcome back, {user?.username ?? "Annotator"}
              </h1>
              <p className="text-xs text-muted-foreground">
                Select a project to start annotating
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              id="btn-new-project"
              onClick={() => setIsCreateOpen(true)}
              size="sm"
              className="gap-1.5"
            >
              <IconPlus className="size-4" />
              New Project
            </Button>
            <Button
              id="btn-logout"
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <IconLogout className="size-4" />
              Log out
            </Button>
          </div>
        </header>

        {/* Summary strip */}
        {!isPending && projects.length > 0 && (
          <div className="flex items-center gap-6 mb-8 px-1">
            <div>
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {projects.length}
              </p>
              <p className="text-xs text-muted-foreground">Projects</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div>
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {projects.reduce((sum, p) => sum + p.image_count, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Total images</p>
            </div>
            <div className="w-px h-8 bg-border" />
            <div>
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {projects.reduce((sum, p) => sum + p.annotated_count, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Annotated</p>
            </div>
          </div>
        )}

        {/* Loading state: Summary Strip */}
        {isPending && (
          <div className="flex items-center gap-6 mb-8 px-1">
            <div>
              <Skeleton className="h-8 w-12 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="w-px h-8 bg-border" />
            <div>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
            <div className="w-px h-8 bg-border" />
            <div>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        )}

        {/* Loading state: Project Grid */}
        {isPending && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="h-full border-border/50">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 w-full">
                      <Skeleton className="size-8 rounded-md shrink-0" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-5 w-10 rounded-full shrink-0" />
                  </div>
                </CardHeader>
                <CardContent className="pb-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <div className="space-y-1.5 mt-2">
                    <Skeleton className="h-1.5 w-full rounded-full" />
                    <Skeleton className="h-2.5 w-16" />
                  </div>
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-2.5 w-24" />
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3 text-center max-w-sm">
              <div className="size-12 flex items-center justify-center rounded-full bg-destructive/10">
                <IconPhotoOff className="size-6 text-destructive" />
              </div>
              <p className="text-sm font-medium">Failed to load projects</p>
              <p className="text-xs text-muted-foreground">
                Make sure the backend is running at http://localhost:8000
              </p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isPending && !isError && projects.length === 0 && (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-4 text-center max-w-sm">
              <div className="size-16 flex items-center justify-center rounded-full bg-muted">
                <IconFolder className="size-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">No projects yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Create your first project by uploading a dataset .zip file.
                </p>
              </div>
              <Button
                id="btn-new-project-empty"
                onClick={() => setIsCreateOpen(true)}
                size="sm"
                className="gap-1.5 mt-2"
              >
                <IconPlus className="size-4" />
                New Project
              </Button>
            </div>
          </div>
        )}

        {/* Project grid */}
        {!isPending && projects.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>

      {/* Create Project Dialog */}
      <CreateProjectDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  );
}
