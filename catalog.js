// ============================================================
// Catalogue Shrewsbury Armory
// Modifie les prix ou ajoute des produits ici — tout le reste
// du site (menu déroulant, auto-remplissage du prix) suit
// automatiquement.
// ============================================================

const CATALOG = [
  {
    category: 'Armes de poing',
    items: [
      { name: 'Pistol', price: 34000 },
      { name: 'Combat Pistol', price: 38000 },
      { name: 'Pistol .50', price: 41000 },
      { name: 'Vintage Pistol', price: 43000 },
      { name: 'SNS Pistol', price: 43000 },
      { name: 'Heavy Pistol', price: 45000 },
    ],
  },
  {
    category: 'Fusils',
    items: [{ name: 'Mousquet Qualité Soignée', price: 47000 }],
  },
  {
    category: 'Armes blanches (permis de chasse requis)',
    items: [
      { name: 'Couteau', price: 4000, requiresHunting: true },
      { name: 'Machette', price: 5000, requiresHunting: true },
      { name: 'Hache', price: 4000, requiresHunting: true },
    ],
  },
  {
    category: 'Munitions',
    items: [
      { name: '9 MM', price: 11000 },
      { name: 'Cal. .50', price: 13000 },
      { name: '32 ACP', price: 13000 },
      { name: '.45 ACP', price: 11000 },
      { name: 'Cartouches de pompe', price: 22000 },
      { name: '7.62 MM', price: 33000 },
      { name: '5.7 MM', price: 33000 },
      { name: '5.56 MM', price: 33000 },
      { name: '357 Magnum', price: 23000 },
      { name: 'Fusées éclairantes', price: 9000 },
      { name: 'Musket (munitions)', price: 8000 },
    ],
  },
  {
    category: 'Accessoires',
    items: [
      { name: 'Repair Kit', price: 20000 },
      { name: 'Parachute', price: 20000 },
      { name: 'Tazer', price: 30000 },
    ],
  },
];

// Recherche rapide d'un produit par son nom exact (utilisé pour
// retrouver le prix / la contrainte "permis de chasse" au choix).
function findCatalogItem(name) {
  for (const group of CATALOG) {
    const found = group.items.find((it) => it.name === name);
    if (found) return { ...found, category: group.category };
  }
  return null;
}
