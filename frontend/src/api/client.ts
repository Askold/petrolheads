import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authToken } from "../telegram";
import type { Admin, MusicTrack, Car, CarInput, CatalogCar, Driver, FeedCar, Lap, LapInput, Leaderboard, Meta, PendingLap, Photo, Profile, ProfileInput, Track } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = authToken();
  if (!token) throw new ApiError(401, "Open this app from Telegram");

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      // FormData sets its own multipart boundary header.
      ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      Authorization: `tma ${token}`,
      ...init.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body?.error ?? `Request failed (${res.status})`);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

const send = <T>(method: string, path: string, body?: unknown) =>
  request<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });

const hasPendingCutouts = (p: Profile | undefined) =>
  p?.cars.some((c) => c.photos.some((ph) => ph.cutoutStatus === "pending")) ?? false;

export const useMyProfile = () =>
  useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => request<Profile>("/api/me"),
    // Poll while background removal is running so the car appears on the turntable when ready.
    refetchInterval: (q) => (hasPendingCutouts(q.state.data) ? 3000 : false),
  });

export const useProfile = (userId: number | undefined) =>
  useQuery({
    queryKey: ["profile", userId],
    queryFn: () => request<Profile>(`/api/users/${userId}`),
    enabled: userId != null,
  });

export const useFeed = () => useQuery({ queryKey: ["feed"], queryFn: () => request<FeedCar[]>("/api/cars/feed") });

export const useLike = () =>
  useInvalidating(
    ({ carId, liked }: { carId: number; liked: boolean }) => send<unknown>(liked ? "POST" : "DELETE", `/api/cars/${carId}/like`),
    [["profile"], ["feed"], ["drivers"]],
  );

export const useDrivers = () => useQuery({ queryKey: ["drivers"], queryFn: () => request<Driver[]>("/api/users") });

export const useMeta = () =>
  // Short-lived: someone who just joined the group should get edit rights without reopening the app.
  useQuery({ queryKey: ["meta"], queryFn: () => request<Meta>("/api/meta"), staleTime: 60_000 });

/** Whether the viewer can add and change things (group member or admin). False until known. */
export const useCanEdit = () => useMeta().data?.isMember ?? false;

export const useCatalog = () =>
  useQuery({ queryKey: ["catalog", "all"], queryFn: () => request<CatalogCar[]>("/api/catalog/all"), staleTime: Infinity });

export const useCatalogSearch = (q: string) =>
  useQuery({
    queryKey: ["catalog", q],
    queryFn: () => request<CatalogCar[]>(`/api/catalog?q=${encodeURIComponent(q)}`),
    enabled: q.trim().length >= 2,
    staleTime: Infinity,
  });

export const useTracks = () => useQuery({ queryKey: ["tracks"], queryFn: () => request<Track[]>("/api/tracks") });

/** Tracks with at least one verified lap: the ones worth showing on the leaderboard. */
export const useTracksWithResults = () =>
  useQuery({ queryKey: ["tracks", "withResults"], queryFn: () => request<Track[]>("/api/tracks?withResults=true") });

export const useLeaderboard = (trackId: number | null) =>
  useQuery({
    queryKey: ["leaderboard", trackId],
    queryFn: () => request<Leaderboard>(`/api/tracks/${trackId}/leaderboard`),
    enabled: trackId != null,
  });

export const usePendingLaps = (enabled: boolean) =>
  useQuery({ queryKey: ["pending"], queryFn: () => request<PendingLap[]>("/api/admin/laps/pending"), enabled });

function useInvalidating<V, R>(fn: (v: V) => Promise<R>, keys: string[][]) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => keys.forEach((queryKey) => qc.invalidateQueries({ queryKey })),
  });
}

export const useUpdateProfile = () =>
  useInvalidating((v: ProfileInput) => send<Profile>("PATCH", "/api/me", v), [["profile"]]);

export const useSaveCar = () =>
  useInvalidating(
    ({ id, ...car }: CarInput & { id?: number }) =>
      id ? send<Car>("PUT", `/api/cars/${id}`, car) : send<Car>("POST", "/api/cars", car),
    [["profile"], ["drivers"]],
  );

export const useDeleteCar = () =>
  useInvalidating((id: number) => send<void>("DELETE", `/api/cars/${id}`), [["profile"], ["leaderboard"]]);

export const useSubmitLap = () => useInvalidating((v: LapInput) => send<Lap>("POST", "/api/laps", v), [["profile"], ["pending"]]);

export const useMusic = () =>
  useQuery({ queryKey: ["music"], queryFn: () => request<MusicTrack[]>("/api/music"), staleTime: 5 * 60_000 });

export const useDeleteMusic = () =>
  useInvalidating((id: number) => send<MusicTrack[]>("DELETE", `/api/admin/music/${id}`), [["music"]]);

export const useAdmins = () => useQuery({ queryKey: ["admins"], queryFn: () => request<Admin[]>("/api/admin/admins") });

export const useAddAdmin = () =>
  useInvalidating((username: string) => send<Admin[]>("POST", "/api/admin/admins", { username }), [["admins"]]);

export const useRemoveAdmin = () =>
  useInvalidating((id: number) => send<Admin[]>("DELETE", `/api/admin/admins/${id}`), [["admins"]]);

export const useReviewLap = () =>
  useInvalidating(
    ({ id, status }: { id: number; status: "verified" | "rejected" }) =>
      send<Lap>("POST", `/api/admin/laps/${id}/review`, { status }),
    [["pending"], ["leaderboard"], ["profile"], ["drivers"], ["feed"], ["tracks", "withResults"]],
  );

export const MAX_PHOTO_BYTES = 15_000_000;

export const useUploadPhotos = () =>
  useInvalidating(
    ({ carId, files }: { carId: number; files: File[] }) => {
      const body = new FormData();
      files.forEach((f) => body.append("photo", f));
      return request<Photo[]>(`/api/cars/${carId}/photos`, { method: "POST", body });
    },
    [["profile"]],
  );

/** Uploads a lap-proof screenshot; resolves to the URL to put in the lap's proofUrl. */
export const useUploadProof = () =>
  useMutation({
    mutationFn: (file: File) => {
      const body = new FormData();
      body.append("file", file);
      return request<{ url: string }>("/api/proofs", { method: "POST", body });
    },
  });

export const useDeletePhoto = () =>
  useInvalidating((photoId: number) => send<void>("DELETE", `/api/photos/${photoId}`), [["profile"]]);

export const useSetCover = () =>
  useInvalidating((photoId: number) => send<void>("POST", `/api/photos/${photoId}/cover`), [["profile"]]);
