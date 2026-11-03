import { createContext, useContext } from "react";

const SystemContext = createContext(null);
const ChallengeContext = createContext(null);
const TaskContext = createContext(null);
const ProfileContext = createContext(null);
const SocialContext = createContext(null);
const RoomContext = createContext(null);
const WeatherContext = createContext(null);
const AudioContext = createContext(null);
const SettingsContext = createContext(null);

function useRequiredContext(context, label) {
  const value = useContext(context);
  if (value === null) throw new Error(`${label} must be used inside StoreProvider`);
  return value;
}

export const useSystemStore = () => useRequiredContext(SystemContext, "useSystemStore");
export const useChallengeStore = () => useRequiredContext(ChallengeContext, "useChallengeStore");
export const useTaskStore = () => useRequiredContext(TaskContext, "useTaskStore");
export const useProfileStore = () => useRequiredContext(ProfileContext, "useProfileStore");
export const useSocialStore = () => useRequiredContext(SocialContext, "useSocialStore");
export const useRoomStore = () => useRequiredContext(RoomContext, "useRoomStore");
export const useWeatherStore = () => useRequiredContext(WeatherContext, "useWeatherStore");
export const useAudioStore = () => useRequiredContext(AudioContext, "useAudioStore");
export const useSettingsStore = () => useRequiredContext(SettingsContext, "useSettingsStore");

/**
 * Compatibility hook for orchestration tests and gradual migrations. Production
 * components should subscribe to the smallest domain hooks above so an unrelated
 * store update cannot invalidate their subtree.
 */
export function useStore() {
  return {
    ...useSystemStore(),
    ...useChallengeStore(),
    ...useTaskStore(),
    ...useProfileStore(),
    ...useSocialStore(),
    ...useRoomStore(),
    ...useWeatherStore(),
    ...useAudioStore(),
    ...useSettingsStore(),
  };
}

export function StoreContextsProvider({
  system,
  challenges,
  tasks,
  profile,
  social,
  room,
  weather,
  audio,
  settings,
  children,
}) {
  return (
    <SystemContext.Provider value={system}>
      <ChallengeContext.Provider value={challenges}>
        <TaskContext.Provider value={tasks}>
          <ProfileContext.Provider value={profile}>
            <SocialContext.Provider value={social}>
              <RoomContext.Provider value={room}>
                <WeatherContext.Provider value={weather}>
                  <AudioContext.Provider value={audio}>
                    <SettingsContext.Provider value={settings}>
                      {children}
                    </SettingsContext.Provider>
                  </AudioContext.Provider>
                </WeatherContext.Provider>
              </RoomContext.Provider>
            </SocialContext.Provider>
          </ProfileContext.Provider>
        </TaskContext.Provider>
      </ChallengeContext.Provider>
    </SystemContext.Provider>
  );
}
