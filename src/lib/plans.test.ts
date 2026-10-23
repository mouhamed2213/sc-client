import { describe, expect, it } from "vitest";
import {
  configuredTabs,
  defaultTabs,
  signatureHeader,
  visibleTabs,
} from "./plans";
import { FICHES } from "../test/fixtures/fiches";

const essentialDefaults = [
  { id: "one", type: "presentation" as const, visible: true },
  { id: "two", type: "reseaux" as const, visible: true },
  { id: "three", type: "localisation" as const, visible: true },
];

describe("Signature template fallback", () => {
  it("uses Signature blocks and theme when an upgraded fiche still has Essentielle defaults", () => {
    const base = FICHES[0];
    const fiche = {
      ...base,
      formule: "signature" as const,
      data: {
        ...base.data,
        onglets: essentialDefaults,
        entete: {
          disposition: "portrait" as const,
          taille: "m" as const,
          theme: "bleu" as const,
        },
      },
    };

    expect(configuredTabs(fiche).map(tab => tab.type)).toEqual(
      defaultTabs("signature").map(tab => tab.type),
    );
    expect(visibleTabs(fiche).map(tab => tab.type)).toContain("galerie");
    expect(signatureHeader(fiche)?.theme).toBe("or");
  });

  it("preserves customized blocks and header choices", () => {
    const base = FICHES[0];
    const customTabs = [
      { id: "custom", type: "presentation" as const, visible: true, titre: "À propos" },
      { id: "links", type: "liens" as const, visible: true },
    ];
    const fiche = {
      ...base,
      formule: "signature" as const,
      data: {
        ...base.data,
        onglets: customTabs,
        entete: {
          disposition: "duo" as const,
          taille: "l" as const,
          theme: "bleu" as const,
        },
      },
    };

    expect(configuredTabs(fiche)).toBe(customTabs);
    expect(visibleTabs(fiche).map(tab => tab.type)).toEqual([
      "presentation",
      "liens",
    ]);
    expect(signatureHeader(fiche)).toEqual(fiche.data.entete);
  });
});
