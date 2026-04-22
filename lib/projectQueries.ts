"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getProjects, createProject } from "./api";
import { useAuthStore } from "./authStore";

// ── Query: fetch user's project list ──

export function useProjectsQuery() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: ["projects"],
    queryFn: () => getProjects(),
    enabled: isAuthenticated,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// ── Mutation: create a new project via ZIP upload ──

export function useCreateProjectMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) => createProject(formData),
    onSuccess: () => {
      // Invalidate the projects list so the dashboard refreshes automatically
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
