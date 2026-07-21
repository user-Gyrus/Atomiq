import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react";
import { toast } from "sonner";
import { Flame } from "lucide-react";
import api from "../../lib/api";
import { useAchievement } from "../context/AchievementContext";
import { OnboardingScreen } from "./OnboardingScreen";
import { LoginScreen } from "./LoginScreen";
import { PrivacyPolicyScreen } from "./PrivacyPolicyScreen";

export const STORAGE_KEY_SESSION = "habit-tracker-session";

export interface AuthContextType {
  session: any;
  updateSession: (updatedUser: any) => void;
  logout: () => void;
  authLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthGate");
  }
  return context;
}

interface AuthGateProps {
  children: ReactNode | ((authProps: AuthContextType) => ReactNode);
  onJoinGroupSuccess?: () => void;
}

export function AuthGate({ children, onJoinGroupSuccess }: AuthGateProps) {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [viewingPrivacy, setViewingPrivacy] = useState<boolean>(false);

  const { showAchievement } = useAchievement();

  /* ---------------------------
     INVITE CODE HANDLING
  ---------------------------- */
  useEffect(() => {
    const path = window.location.pathname;

    // Check for Friend Invite
    const inviteMatch = path.match(/^\/invite\/([a-zA-Z0-9-]+)$/);
    if (inviteMatch && inviteMatch[1]) {
      const code = inviteMatch[1];
      console.log("🔗 Invite link detected:", code);
      localStorage.setItem("pendingInviteCode", code);
      window.history.replaceState({}, document.title, "/");
    }

    // Check for Group Join
    const joinMatch = path.match(/^\/join\/([a-zA-Z0-9-]+)$/);
    if (joinMatch && joinMatch[1]) {
      const code = joinMatch[1];
      console.log("🔗 Group Join link detected:", code);
      localStorage.setItem("pendingGroupCode", code);
      window.history.replaceState({}, document.title, "/");
    }
  }, []);

  const processPendingInvite = useCallback(async (userToken: string) => {
    const pendingCode = localStorage.getItem("pendingInviteCode");
    if (!pendingCode) return;

    console.log("🤝 Processing pending invite:", pendingCode);

    try {
      const searchRes = await api.get(`/friends/search?code=${pendingCode}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const friendData = searchRes.data;

      if (friendData && friendData._id) {
        await api.post(
          "/friends/add",
          { friendId: friendData._id },
          {
            headers: { Authorization: `Bearer ${userToken}` },
          },
        );
        toast.success(
          `You are now connected with ${friendData.displayName || "your friend"}! 🤝`,
        );
        localStorage.removeItem("pendingInviteCode");
      }
    } catch (err: any) {
      console.error("Failed to process invite:", err);
      const msg =
        err.response?.data?.message || "Could not process invite link";

      localStorage.removeItem("pendingInviteCode");

      if (msg !== "User is already your friend") {
        toast.error(msg);
      }
    }
  }, []);

  const processPendingGroupInvite = useCallback(async (userToken: string) => {
    const pendingCode = localStorage.getItem("pendingGroupCode");
    if (!pendingCode) return;

    console.log("🤝 Processing pending GROUP invite:", pendingCode);

    try {
      await api.post(
        "/groups/join",
        { groupCode: pendingCode },
        {
          headers: { Authorization: `Bearer ${userToken}` },
        },
      );

      toast.success("Successfully joined the squad! 🎉");
      localStorage.removeItem("pendingGroupCode");

      if (onJoinGroupSuccess) {
        onJoinGroupSuccess();
      }
    } catch (err: any) {
      console.error("Failed to process group invite:", err);
      const msg = err.response?.data?.message || "Could not join squad";

      localStorage.removeItem("pendingGroupCode");

      if (msg !== "You are already a member of this squad") {
        toast.error(msg);
      } else {
        toast.info("You are already in this squad");
        if (onJoinGroupSuccess) {
          onJoinGroupSuccess();
        }
      }
    }
  }, [onJoinGroupSuccess]);

  const logout = useCallback(() => {
    setSession(null);
    localStorage.removeItem(STORAGE_KEY_SESSION);
  }, []);

  /* ---------------------------
     AUTH SESSION (LOCAL STORAGE)
  ---------------------------- */
  useEffect(() => {
    const storedSession = localStorage.getItem(STORAGE_KEY_SESSION);
    if (storedSession) {
      try {
        const parsedSession = JSON.parse(storedSession);
        setSession(parsedSession);

        if (parsedSession.token) {
          api
            .get("/auth/me")
            .then((res) => {
              const newSession = { ...parsedSession, ...res.data };
              setSession(newSession);
              localStorage.setItem(
                STORAGE_KEY_SESSION,
                JSON.stringify(newSession),
              );

              processPendingInvite(parsedSession.token);
              processPendingGroupInvite(parsedSession.token);
            })
            .catch((err) => {
              console.error("Session refresh failed", err);
              if (err.response?.status === 401) {
                logout();
              }
            });
        }
      } catch (err) {
        console.error("Failed to parse stored session", err);
      }
    }

    const hasOnboarded = localStorage.getItem("HAS_COMPLETED_ONBOARDING");
    if (hasOnboarded === "true") {
      setOnboardingComplete(true);
    }

    setAuthLoading(false);
  }, [logout, processPendingGroupInvite, processPendingInvite]);

  const handleOnboardingComplete = (target: "login" | "signup") => {
    localStorage.setItem("HAS_COMPLETED_ONBOARDING", "true");
    setAuthMode(target);
    setOnboardingComplete(true);
  };

  const handleLogin = (user: any) => {
    setSession(user);
    localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(user));

    if (user.token) {
      processPendingInvite(user.token);
      processPendingGroupInvite(user.token);
    }
  };

  const updateSession = useCallback((updatedUser: any) => {
    setSession((prevSession: any) => {
      if (prevSession?.streak !== undefined && updatedUser.streak !== undefined) {
        const oldStreak = prevSession.streak;
        const newStreak = updatedUser.streak;

        if (newStreak > oldStreak) {
          if (oldStreak === 0 && newStreak >= 1) {
            showAchievement({
              title: "Streak Ignited!",
              description:
                "You've successfully started your habit streak. Keep the fire burning!",
              type: "streak",
              icon: (
                <Flame className="w-12 h-12 text-orange-500 fill-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.8)] animate-pulse" />
              ),
            });
          } else {
            toast.success(`${newStreak} Day Streak!`, {
              description: "Another day, another victory.",
              icon: <Flame className="w-5 h-5 text-orange-500" />,
            });
          }
        }
      }

      if (updatedUser.streakFreezes !== undefined) {
        const oldFreezes = prevSession?.streakFreezes || 0;
        const newFreezes = updatedUser.streakFreezes;

        if (newFreezes > oldFreezes) {
          const freezesEarned = newFreezes - oldFreezes;
          showAchievement({
            title: "Streak Freeze Earned! ❄️",
            description: `You've earned ${freezesEarned} Streak Freeze${freezesEarned > 1 ? "s" : ""}! Use it to protect your streak on tough days.`,
            type: "freeze",
            icon: <div className="text-6xl animate-pulse">❄️</div>,
          });
        }
      }

      const newSession = { ...prevSession, ...updatedUser };
      localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(newSession));
      return newSession;
    });
  }, [showAchievement]);

  const authValue: AuthContextType = {
    session,
    updateSession,
    logout,
    authLoading,
  };

  /* ---------------------------
     AUTH GATE RENDER
  ---------------------------- */
  return (
    <AuthContext.Provider value={authValue}>
      {authLoading ? (
        <div className="min-h-screen grid place-items-center text-white">
          Loading…
        </div>
      ) : !session ? (
        !onboardingComplete ? (
          <OnboardingScreen onComplete={handleOnboardingComplete} />
        ) : viewingPrivacy ? (
          <PrivacyPolicyScreen onBack={() => setViewingPrivacy(false)} />
        ) : (
          <LoginScreen
            onLogin={handleLogin}
            initialMode={authMode}
            onViewPrivacyPolicy={() => setViewingPrivacy(true)}
          />
        )
      ) : typeof children === "function" ? (
        children(authValue)
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

