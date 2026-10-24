import { ref, onMounted, onUnmounted, type Ref } from "vue";

export interface NetworkInformationState {
  isOnline: Ref<boolean>;
  downlink: Ref<number | null>;
  rtt: Ref<number | null>;
  effectiveType: Ref<string | null>;
  saveData: Ref<boolean>;
}

export function useNetworkStatus(): NetworkInformationState {
  const isOnline = ref(typeof navigator !== "undefined" ? navigator.onLine : true);
  const downlink = ref<number | null>(null);
  const rtt = ref<number | null>(null);
  const effectiveType = ref<string | null>(null);
  const saveData = ref(false);

  const updateNetworkInfo = () => {
    if (typeof navigator === "undefined") return;

    isOnline.value = navigator.onLine;

    const connection = (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    if (connection) {
      downlink.value = connection.downlink ?? null;
      rtt.value = connection.rtt ?? null;
      effectiveType.value = connection.effectiveType ?? null;
      saveData.value = Boolean(connection.saveData);
    }
  };

  const onOnline = () => {
    isOnline.value = true;
    updateNetworkInfo();
  };

  const onOffline = () => {
    isOnline.value = false;
  };

  let connectionObj: any = null;

  onMounted(() => {
    if (typeof window !== "undefined") {
      window.addEventListener("online", onOnline);
      window.addEventListener("offline", onOffline);

      connectionObj = (navigator as any)?.connection ||
        (navigator as any)?.mozConnection ||
        (navigator as any)?.webkitConnection;

      if (connectionObj) {
        connectionObj.addEventListener("change", updateNetworkInfo);
      }
    }
    updateNetworkInfo();
  });

  onUnmounted(() => {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      if (connectionObj) {
        connectionObj.removeEventListener("change", updateNetworkInfo);
      }
    }
  });

  // Call immediately for initial state
  updateNetworkInfo();

  return {
    isOnline,
    downlink,
    rtt,
    effectiveType,
    saveData
  };
}
