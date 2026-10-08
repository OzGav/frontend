import type { ContextMenuItem } from "@/helpers/context_menu_item";
import type { Artist } from "@/plugins/api/interfaces";
import { getClassicalRoles } from "@/services/classical";
import { Feather, Users } from "@lucide/vue";
import { ref, watch, type Ref } from "vue";
import { useRouter } from "vue-router";

/**
 * Menu entries leading from an artist's normal page to their Classical
 * composer and performer pages, one for each role they hold there.
 */
export function useClassicalArtistLinks(
  artist: () => Artist | undefined,
): Ref<ContextMenuItem[]> {
  const router = useRouter();
  const items = ref<ContextMenuItem[]>([]);

  watch(
    () => artist()?.uri,
    async () => {
      items.value = [];
      const current = artist();
      // the classical lists only know library ids; another source's id could
      // belong to a different library artist
      if (current?.provider !== "library" || !current.is_classical) return;
      const { composer, performer } = await getClassicalRoles(current.item_id);
      if (artist()?.uri !== current.uri) return;
      const links: ContextMenuItem[] = [];
      if (composer)
        links.push({
          label: "classical_show_composer",
          labelArgs: [],
          icon: Feather,
          action: () => router.push(`/classical/composers/${current.item_id}`),
        });
      if (performer)
        links.push({
          label: "classical_show_performer",
          labelArgs: [],
          icon: Users,
          action: () => router.push(`/classical/performers/${current.item_id}`),
        });
      items.value = links;
    },
    { immediate: true },
  );

  return items;
}
