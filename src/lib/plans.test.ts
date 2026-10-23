import { describe, expect, it } from "vitest";
import { configuredTabs, defaultTabs, visibleTabs } from "./plans";
import { FICHES } from "../test/fixtures/fiches";

describe("configuredTabs", () => {
  it("uses Signature defaults when an upgraded fiche still has untouched Essentielle defaults", () => {
    const base = FICHES[0];
    const fiche = {
      ...base,
      formule: "signature" as const,
      data: {
        ...base.data,
        onglets: [
          { id: "a", type: "presentation" as const, visible: true },
          { id: "b", type: "reseaux" as const, visible: true },
          { id: "c", type: "localisation" as const, visible: true },
        ],
      },
    };

    expect(configuredTabs(fiche).map(tab => tab.type)).toEqual(
      defaultTabs("signature").map(tab => tab.type),
    );
    expect(visibleTabs(fiche).map(tab => tab.type)).toContain("galerie");
  });

  it("preserves customized tabs on an upgraded Signature fiche", () => {
    const base = FICHES[0];
    const customTabs = [
      { id: "custom", type: "presentation" as const, visible: true, titre: "À propos" },
      { id: "links", type: "liens" as const, visible: true },
    ];
    const fiche = {
      ...base,
      formule: "signature" as const,
      data: { ...base.data, onglets: customTabs },
    };

    expect(configuredTabs(fiche)).toBe(customTabs);
    expect(visibleTabs(fiche).map(tab => tab.type)).toEqual([
      "presentation",
      "liens",
    ]);
  });
});
