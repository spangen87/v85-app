import { horseIdOf } from "@/lib/atg";

describe("horseIdOf: utländska hästar saknar id hos ATG", () => {
  it("använder ATG:s id när det finns", () => {
    expect(horseIdOf({ id: 794009, name: "Jaguar Godiva" })).toBe("794009");
  });

  it("ger ett stabilt, URL-säkert eget id av land och namn när id saknas", () => {
    expect(horseIdOf({ name: "Tripsson Ø.K.", nationality: "NO", foreignOwned: true })).toBe("utl-no-tripsson-ok");
    expect(horseIdOf({ name: "Kollund Møbler", nationality: "DK" })).toBe("utl-dk-kollund-mobler");
    expect(horseIdOf({ name: "Zero Hugs'n Kisses", nationality: "DK" })).toBe("utl-dk-zero-hugsn-kisses");
    expect(horseIdOf({ name: "Alm Kevin" })).toBe("utl-alm-kevin");
  });

  it("samma häst får samma id vid nästa hämtning", () => {
    const h = { name: "Gigant Tider", nationality: "NO" };
    expect(horseIdOf({ ...h })).toBe(horseIdOf({ ...h }));
  });

  it("utan id och namn blir det tomt (hoppas över som förut)", () => {
    expect(horseIdOf({})).toBe("");
  });
});
