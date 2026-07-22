import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { Menu } from "lucide-react";
import { AchievementProvider } from "./context/AchievementContext";
import api from "../lib/api";

import { HabitsScreen } from "./components/HabitsScreen";
import { CreateHabitScreen } from "./components/CreateHabitScreen";
import { ProfileScreen } from "./components/ProfileScreen";
import { SocialScreen } from "./components/SocialScreen";
import { GroupsScreen } from "./components/squads/GroupsScreen";
import { CreateGroupScreen } from "./components/squads/CreateGroupScreen";
import { GroupDetailsScreen } from "./components/squads/GroupDetailsScreen";
import { InviteFriendScreen } from "./components/InviteFriendScreen";
import { BottomNav } from "./components/BottomNav";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import UpdateNotification from "./components/UpdateNotification";
import { HabitsScreenSkeleton } from "./components/LoadingSkeletons";
import { PrivacyPolicyScreen } from "./components/PrivacyPolicyScreen";
import { AuthGate, STORAGE_KEY_SESSION } from "./components/AuthGate";

type Screen =
  | "habits"
  | "create"
  | "profile"
  | "social"
  | "groups"
  | "create-group"
  | "group-details"
  | "invite-friend"
  | "privacy-policy";

interface Habit {
  _id: string;
  name: string;
  microIdentity: string | null;
  type: string;
  goal: number;
  activeDays: number[];
  createdAt: string;
  completions: string[];
  visibility?: "public" | "private";
  duration: number;
  associatedGroup?: string; // Squad link

  // fields that are used for frontend convenience
  id: string;
  micro_identity: string | null;
  completed_today: boolean;
  completionsCount: number;
}

export default function App() {
  return (
    <AchievementProvider>
      <AppContent />
    </AchievementProvider>
  );
}

function AppContent() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("habits");

  return (
    <AuthGate onJoinGroupSuccess={() => setCurrentScreen("groups")}>
      {({ session, updateSession }) => (
        <MainLayout
          session={session}
          updateSession={updateSession}
          currentScreen={currentScreen}
          setCurrentScreen={setCurrentScreen}
        />
      )}
    </AuthGate>
  );
}

interface MainLayoutProps {
  session: any;
  updateSession: (user: any) => void;
  currentScreen: Screen;
  setCurrentScreen: (screen: Screen) => void;
}

function MainLayout({
  session,
  updateSession,
  currentScreen,
  setCurrentScreen,
}: MainLayoutProps) {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitsLoading, setHabitsLoading] = useState<boolean>(false);
  const [creationDefaults, setCreationDefaults] = useState<any>(null);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  // Navigation Helper
  const handleNavigate = (screen: Screen, data?: any) => {
    if (screen === "create" && data) {
      setCreationDefaults(data);
    } else {
      setCreationDefaults(null);
    }
    setCurrentScreen(screen);
  };

  /* ---------------------------
     LOAD HABITS
  ---------------------------- */
  useEffect(() => {
    if (!session?.token) return;

    const loadHabits = async () => {
      try {
        setHabitsLoading(true);
        const res = await api.get("/habits");
        const allHabits: Habit[] = res.data;

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        const today = `${year}-${month}-${day}`;

        const currentDayIndex = now.getDay();
        const todayNum = currentDayIndex === 0 ? 7 : currentDayIndex;

        const todaysHabits = allHabits.filter((h) => {
          if (h.duration) {
            const completionCount = h.completions ? h.completions.length : 0;
            if (completionCount >= h.duration) return false;
          }
          return h.activeDays && h.activeDays.includes(todayNum);
        });

        const normalized: Habit[] = todaysHabits.map((h) => ({
          ...h,
          id: h._id,
          micro_identity: h.microIdentity,
          completed_today: h.completions.includes(today),
          completionsCount: h.completions.length,
        }));

        setHabits(normalized);
      } catch (err) {
        console.error("Failed to load habits", err);
      } finally {
        setHabitsLoading(false);
      }
    };

    loadHabits();
  }, [session, currentScreen]);

  /* ---------------------------
     RELOAD SESSION (for profile updates)
  ---------------------------- */
  useEffect(() => {
    const storedSession = localStorage.getItem(STORAGE_KEY_SESSION);
    if (storedSession) {
      try {
        const parsedSession = JSON.parse(storedSession);
        if (JSON.stringify(parsedSession) !== JSON.stringify(session)) {
          updateSession(parsedSession);
        }
      } catch (e) {
        console.error("Error parsing stored session", e);
      }
    }
  }, [currentScreen]);

  /* ---------------------------
     EDIT HABIT
  ---------------------------- */
  const handleEditHabit = async (id: string) => {
    try {
      const res = await api.get("/habits");
      const all: Habit[] = res.data;
      const found = all.find((h: any) => h._id === id);
      if (found) {
        setEditingHabit(found);
        setCurrentScreen("create");
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not load habit details");
    }
  };

  /* ---------------------------
     CREATE / UPDATE HABIT
  ---------------------------- */
  const handleCreateOrUpdateHabit = async (habitData: any): Promise<void> => {
    try {
      let res;
      const isEditing = habitData._id || editingHabit;
      const habitId = habitData._id || editingHabit?._id;

      if (isEditing && habitId) {
        res = await api.put(`/habits/${habitId}`, habitData);
        toast.success("Habit updated successfully!");
      } else {
        res = await api.post("/habits", habitData);
        toast.success("Habit created successfully!");
      }

      const data = res.data;

      if (data.streak !== undefined && session) {
        const updatedSession = {
          ...session,
          streak: data.streak,
          streakHistory: data.streakHistory,
          streakFreezes: data.streakFreezes,
          lastCompletedDate: data.lastCompletedDate,
          streakState: data.streakState,
          emberDays: data.emberDays,
          frozenDays: data.frozenDays,
          completionPercentage: data.completionPercentage,
        };
        updateSession(updatedSession);
      }

      setEditingHabit(null);
      setCreationDefaults(null);
      setCurrentScreen("habits");
    } catch (err) {
      toast.error(
        habitData._id || editingHabit
          ? "Error updating habit"
          : "Error creating habit",
      );
      console.error("Error saving habit", err);
    }
  };

  /* ---------------------------
     COMPLETE HABIT (TODAY)
  ---------------------------- */
  const handleCompleteHabit = async (habitId: string): Promise<void> => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const today = `${year}-${month}-${day}`;

    setHabits((prev) =>
      prev.map((h) =>
        h._id === habitId
          ? {
              ...h,
              completed_today: true,
              completionsCount: (h.completionsCount || 0) + 1,
            }
          : h,
      ),
    );

    try {
      const allRes = await api.get("/habits");
      const allHabits: Habit[] = allRes.data;
      const targetHabit = allHabits.find((h: any) => h._id === habitId);

      if (targetHabit && !targetHabit.completions.includes(today)) {
        const updatedCompletions = [...targetHabit.completions, today];
        const updateRes = await api.put(`/habits/${habitId}`, {
          completions: updatedCompletions,
        });
        const data = updateRes.data;

        if (data.streak !== undefined && session) {
          const updatedSession = {
            ...session,
            streak: data.streak,
            streakHistory: data.streakHistory,
            streakFreezes: data.streakFreezes,
            lastCompletedDate:
              data.lastCompletedDate || session.lastCompletedDate,
            streakState: data.streakState,
            emberDays: data.emberDays,
            frozenDays: data.frozenDays,
            completionPercentage: data.completionPercentage,
          };
          updateSession(updatedSession);
        }
      }
    } catch (err) {
      console.error("Failed to complete habit", err);
    }
  };

  /* ---------------------------
     UNDO HABIT (TODAY)
  ---------------------------- */
  const handleUndoHabit = async (habitId: string): Promise<void> => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const today = `${year}-${month}-${day}`;

    setHabits((prev) =>
      prev.map((h) =>
        h._id === habitId
          ? {
              ...h,
              completed_today: false,
              completionsCount: Math.max(0, (h.completionsCount || 0) - 1),
            }
          : h,
      ),
    );

    try {
      const allRes = await api.get("/habits");
      const allHabits: Habit[] = allRes.data;
      const targetHabit = allHabits.find((h: any) => h._id === habitId);

      if (targetHabit && targetHabit.completions.includes(today)) {
        const updatedCompletions = targetHabit.completions.filter(
          (d: string) => d !== today,
        );
        const updateRes = await api.put(`/habits/${habitId}`, {
          completions: updatedCompletions,
        });
        const data = updateRes.data;

        if (data.streak !== undefined && session) {
          const updatedSession = {
            ...session,
            streak: data.streak,
            streakHistory: data.streakHistory,
            streakFreezes: data.streakFreezes,
            lastCompletedDate:
              data.lastCompletedDate || session.lastCompletedDate,
            streakState: data.streakState,
            emberDays: data.emberDays,
            frozenDays: data.frozenDays,
            completionPercentage: data.completionPercentage,
          };
          updateSession(updatedSession);
        }
      }
    } catch (err) {
      console.error("Failed to undo habit", err);
      toast.error("Failed to undo habit");
    }
  };

  /* ---------------------------
     DELETE HABIT
  ---------------------------- */
  const handleDeleteHabit = async (habitId: string) => {
    try {
      const res = await api.delete(`/habits/${habitId}`);
      const data = res.data;

      setHabits((prev) => prev.filter((h) => h._id !== habitId));
      toast.success("Habit deleted");
      if (data.streak !== undefined && session) {
        updateSession({
          ...session,
          streak: data.streak,
          streakHistory: data.streakHistory,
          streakFreezes: data.streakFreezes,
          lastCompletedDate: data.lastCompletedDate,
          streakState: data.streakState,
          emberDays: data.emberDays,
          frozenDays: data.frozenDays,
          completionPercentage: data.completionPercentage,
        });
      }
    } catch (err) {
      toast.error("Error deleting habit");
      console.error("Failed to delete habit", err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--bg-gradient-start)] to-[var(--bg-gradient-end)] text-foreground overflow-x-hidden transition-colors duration-500">
      <div className="max-w-md mx-auto min-h-screen flex flex-col relative md:shadow-2xl md:border-x md:border-card-border">
        {/* FIXED HEADER (Only on Habits Screen) */}
        {currentScreen === "habits" && (
          <div className="fixed top-0 left-0 right-0 z-[100] max-w-md mx-auto">
            <div className="bg-nav-bg/95 backdrop-blur-xl transition-all border-b border-nav-border py-4 px-6 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 shadow-md border-2 border-background" />
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-1.5">
                    <span className="truncate">
                      Hi {session?.display_name || session?.username || "Guest"}
                    </span>
                    <span className="animate-pulse flex-shrink-0">👋</span>
                  </h1>
                </div>
              </div>
              <button
                onClick={() => setShowProfileModal((prev) => !prev)}
                className="p-2 hover:bg-secondary rounded-xl transition-all active:scale-95 border border-transparent"
              >
                <Menu size={24} className="text-muted-foreground" />
              </button>
            </div>
          </div>
        )}

        <main
          className={`flex-1 pb-20 overflow-y-auto ${currentScreen === "habits" ? "pt-24" : ""}`}
        >
          <AnimatePresence mode="wait">
            {currentScreen === "habits" && (
              <motion.div
                key="habits"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                {habitsLoading ? (
                  <HabitsScreenSkeleton />
                ) : (
                  <HabitsScreen
                    habits={habits}
                    onCompleteHabit={handleCompleteHabit}
                    onUndoHabit={handleUndoHabit}
                    onEditHabit={handleEditHabit}
                    onDeleteHabit={handleDeleteHabit}
                    onNavigate={setCurrentScreen}
                    streak={session?.streak || 0}
                    streakHistory={session?.streakHistory || []}
                    frozenDays={session?.frozenDays || []}
                    streakState={session?.streakState || "extinguished"}
                    completionPercentage={session?.completionPercentage || 0}
                  />
                )}
              </motion.div>
            )}

            {currentScreen === "create" && (
              <motion.div key="create">
                <CreateHabitScreen
                  onBack={() => {
                    setCurrentScreen("habits");
                    setEditingHabit(null);
                    setCreationDefaults(null);
                  }}
                  onCreate={handleCreateOrUpdateHabit}
                  initialData={editingHabit || creationDefaults}
                />
              </motion.div>
            )}

            {currentScreen === "profile" && (
              <motion.div key="profile">
                <ProfileScreen
                  onNavigate={setCurrentScreen}
                  updateSession={updateSession}
                  streak={session?.streak || 0}
                  streakFreezes={session?.streakFreezes || 0}
                />
              </motion.div>
            )}

            {currentScreen === "groups" && (
              <motion.div key="groups">
                <GroupsScreen
                  onNavigate={setCurrentScreen}
                  onSelectGroup={(id) => {
                    setSelectedGroupId(id);
                    setCurrentScreen("group-details");
                  }}
                />
              </motion.div>
            )}

            {currentScreen === "create-group" && (
              <motion.div key="create-group">
                <CreateGroupScreen onNavigate={setCurrentScreen} />
              </motion.div>
            )}

            {currentScreen === "group-details" && selectedGroupId && (
              <motion.div key="group-details">
                <GroupDetailsScreen
                  onNavigate={handleNavigate}
                  groupId={selectedGroupId}
                />
              </motion.div>
            )}

            {currentScreen === "invite-friend" && selectedGroupId && (
              <motion.div key="invite-friend">
                <InviteFriendScreen
                  onNavigate={setCurrentScreen}
                  groupId={selectedGroupId}
                />
              </motion.div>
            )}

            {currentScreen === "social" && (
              <motion.div key="social">
                <SocialScreen
                  onNavigate={setCurrentScreen}
                  habits={habits}
                  streak={session?.streak || 0}
                />
              </motion.div>
            )}

            {currentScreen === "privacy-policy" && (
              <motion.div key="privacy-policy">
                <PrivacyPolicyScreen onBack={() => setCurrentScreen("profile")} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <BottomNav
          currentScreen={currentScreen}
          onNavigate={setCurrentScreen}
        />

        {/* Global Profile Modal */}
        {showProfileModal && (
          <ProfileScreen
            onNavigate={(screen) => {
              setCurrentScreen(screen);
              setShowProfileModal(false);
            }}
            isModal={true}
            onClose={() => setShowProfileModal(false)}
            updateSession={updateSession}
            streak={session?.streak || 0}
            streakFreezes={session?.streakFreezes || 0}
          />
        )}
      </div>
      <PWAInstallPrompt />
      <Toaster />
      <UpdateNotification />
    </div>
  );
}
