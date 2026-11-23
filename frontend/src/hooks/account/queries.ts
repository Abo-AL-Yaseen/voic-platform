import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/queries";
import { accountKeys } from "./keys";
import { ApiError } from "../../services/api";
import { readProfile, saveProfile, readStaffAccess, type ProfileInput } from "../../services/auth";
import { queryClient } from "../../services/queryClient";
async function privateRead<T>(read: (signal?: AbortSignal) => Promise<T>, signal?: AbortSignal) {
  try {
    return await read(signal);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401)
      window.dispatchEvent(new Event("voic:session-expired"));
    throw error;
  }
}
export function useProfile() {
  const auth = useAuth(),
    user = auth.session?.user;
  return useQuery({
    queryKey: accountKeys.profile(user?.id || "anonymous", auth.epoch),
    queryFn: ({ signal }) => privateRead(readProfile, signal),
    enabled: !!user && user.role === "customer",
    meta: { private: true },
    staleTime: 0,
    retry: false,
  });
}
export function useSaveProfile() {
  const auth = useAuth(),
    userId = auth.session?.user?.id;
  return useMutation({
    meta: { private: true },
    retry: false,
    mutationFn: async (body: ProfileInput) => {
      let result;
      try {
        result = await saveProfile(body, await auth.csrf());
      } catch (error) {
        if (error instanceof ApiError && error.status === 401)
          window.dispatchEvent(new Event("voic:session-expired"));
        throw error;
      }
      if (userId === result.id)
        await queryClient.invalidateQueries({
          queryKey: accountKeys.profile(userId!, auth.epoch),
          exact: true,
        });
      await auth.refresh();
      return result;
    },
  });
}
export function useStaffAccess() {
  const auth = useAuth(),
    user = auth.session?.user;
  return useQuery({
    queryKey: ["staff", user?.id, auth.epoch, "access"],
    queryFn: ({ signal }) => privateRead(readStaffAccess, signal),
    enabled: !!user && user.role !== "customer",
    meta: { private: true },
    staleTime: 0,
    retry: false,
  });
}
