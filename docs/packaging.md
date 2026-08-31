# Packaging and shipping dimensions

How the shop turns a cart into one parcel, what that parcel costs to pack, and
which Stripe product metadata it all depends on.

Australia Post prices a parcel on **both** its weight and its size, so getting
the dimensions wrong costs real money in either direction — quote too small and
we absorb the difference, quote too large and the customer is overcharged and
may not buy.

- Code: [`src/features/shop/checkout/utils/packaging.server.ts`](../src/features/shop/checkout/utils/packaging.server.ts)
- Metadata reading: [`src/utils/server/stripe/readPackaging.server.ts`](../src/utils/server/stripe/readPackaging.server.ts)
- Tests: [`src/features/shop/checkout/utils/__tests__/packaging.test.ts`](../src/features/shop/checkout/utils/__tests__/packaging.test.ts)

---

## Required product metadata

Set these on each product in the **Stripe Dashboard → Products → Metadata**.
Metadata values are always strings; the app parses and validates them, and a
malformed value fails loudly rather than being guessed at.

Remember to set them in **both test and live mode** — metadata is not copied
between them.

### Every product

| Key | Example | Notes |
| --- | --- | --- |
| `weight` | `200` | Grams, whole number. The weight of the product **as shipped**, including its own packaging. Required. |
| `status` | `available` | `available`, `not-available` or `preorder`. |
| `packagingType` | `bag` | `bag` or `box`. See below. Defaults to `bag` with a warning if absent. |

### Bagged products (`packagingType: bag`)

Padded satchels. The satchels themselves are shop-wide — a bagged product only
declares **how many of itself** fit in each size.

| Key | Example | Notes |
| --- | --- | --- |
| `bagCapacitySmall` | `1` | Max units of this product per small satchel. `0` means it does not fit. |
| `bagCapacityMedium` | `3` | As above, medium satchel. |
| `bagCapacityLarge` | `10` | As above, large satchel. |

### Boxed products (`packagingType: box`)

Cartons. Both the carton and its cost vary per product, so both live here.

| Key | Example | Notes |
| --- | --- | --- |
| `boxDimensions` | `24x16x8` | `LxWxH` in **centimetres**. One field so three numbers cannot disagree. |
| `boxPackagingCents` | `377` | What the packaging for one unit costs, in cents. E.g. $3.39 carton + $0.38 glassine = `377`. |

### Bundles (any product that is really several others)

| Key | Example | Notes |
| --- | --- | --- |
| `combo` | `{"prod_QYzaVvEwI509MU": 10}` | JSON: Stripe **product id** → quantity. |

A bundle is a billing concept; the warehouse packs its contents. A product with
`combo` set is expanded into its constituents for packing, and its own
`packagingType` is ignored — so a bundle does **not** need packaging keys.

> **A bundle that genuinely ships as one carton** should be modelled as a plain
> `box` product with its own `boxDimensions`, not as a `combo`.

> **`combo` affects dimensions only, never weight.** The bundle's own `weight`
> already covers its contents; expanding it for weight would count them twice.

---

## How the parcel is worked out

### 1. Expand bundles

Each cart line becomes one or more **packing units** (a product plus a count).
Anything with `combo` is replaced by its constituents, multiplied by how many
bundles were ordered, and identical products from different lines are merged.
Nesting is allowed but capped, and a bundle that contains itself is rejected.

### 2. Weight

A plain tally: `Σ weight × quantity` over the **cart** lines, not the expanded
units.

### 3. Satchels for the bagged units

Each unit takes up `1 / bagCapacity[size]` of a satchel, so different products
can share one — an item that fits ten to a large satchel takes a tenth of it.

For each size, smallest first, the occupancy is `Σ quantity / capacity`. The
first size where that total is `≤ 1` wins. A product that does not fit a size at
all rules that size out entirely.

If nothing fits in a single large satchel, the order is packed into
`ceil(occupancy)` large satchels. That rounds a part-full last satchel up to a
whole one, which over-states slightly — the direction the error should fall.

### 4. Cartons for the boxed units

One carton per unit, at its own dimensions and its own cost. No sharing.

### 5. Combine into one parcel

Australia Post is quoted on a single parcel, so the satchels and cartons are
combined **by volume, not by stacking heights**:

- **Volume** = the sum of every satchel's and carton's volume.
- **Footprint** = that of the single largest item, by area.
- **Height** = whatever makes the volume add up, floored at the tallest item
  (a parcel cannot be shorter than its contents) and rounded up to a whole
  centimetre.

Stacking heights instead would invent a tall, thin parcel and quote far above
what the order really costs to send. Volume is what Australia Post cubes on, so
volume is what is preserved.

### 6. Cost

```
postage charged = roundUpTo10c( AusPost quote + Σ satchel costs + Σ carton costs )
```

Satchel costs are shop-wide constants; carton costs come from
`boxPackagingCents`. The rounding is upward so we are never a cent short.

---

## Shop-wide satchels

Defined in `BAG_SIZES` in `packaging.server.ts`, carried over from the old
site's `fees.json`. Change them there, not in product metadata.

| Size | Dimensions (cm) | Cost |
| --- | --- | --- |
| Small | 22.9 × 15.1 × 5 | $1.65 |
| Medium | 43 × 28.5 × 5 | $2.75 |
| Large | 48.5 × 36 × 5 | $3.45 |

---

## What ends up on the payment

So an Australia Post consignment can be raised straight from a Stripe payment
without re-deriving anything, the PaymentIntent metadata carries:

| Key | Example |
| --- | --- |
| `weightGrams` | `2200` |
| `parcelDimensionsCm` | `48.5x36x10` |
| `packagingCents` | `690` |
| `packaging` | `2 large satchels` |
| `productSummary` | `Ro/Box x 11` |
| `products` | `{"prod_QYzaVvEwI509MU":11}` |
| `subtotalCents` / `shippingCents` | `38500` / `3140` |

These keys are absent, rather than zero, when no shipment was priced.

---

## Worked examples

Using the current V1 kit (bag, 1/3/10 per satchel, 200 g) and a hypothetical V2
box (24 × 16 × 8, $3.77, 500 g).

| Cart | Packing | Parcel (cm) | Packaging |
| --- | --- | --- | --- |
| 1 kit | 1/1 of a small satchel | 22.9 × 15.1 × 5 | $1.65 |
| 3 kits | 3/3 of a medium satchel | 43 × 28.5 × 5 | $2.75 |
| 4 kits | 4/10 of a large satchel | 48.5 × 36 × 5 | $3.45 |
| 10 kits | 10/10 of a large satchel | 48.5 × 36 × 5 | $3.45 |
| 11 kits | 1.1 → 2 large satchels | 48.5 × 36 × 10 | $6.90 |
| 1 ten-pack (`combo: 10 kits`) | expands to 10 kits → 1 large satchel | 48.5 × 36 × 5 | $3.45 |
| 1 ten-pack + 1 kit | expands to 11 kits → 2 large satchels | 48.5 × 36 × 10 | $6.90 |
| 3 V2 boxes | 3 cartons | 24 × 16 × 24 | $11.31 |
| 1 kit + 1 V2 box | 1 small satchel + 1 carton | 24 × 16 × 13 | $5.42 |

---

## Gotchas

- **Sunset: `unitVolume`.** It used to stand in for "how many kits is this", and
  drove a single hardcoded box size. It is no longer read. Bundles use `combo`;
  sizes come from `bagCapacity*` / `boxDimensions`. The key can stay on existing
  products harmlessly, but nothing consumes it.
- **A bundle without `combo` is packed as one item.** It will be quoted as a
  single unit of itself, which for a multi-kit pack is much too small. The server
  logs `[packaging] <product> has no bagCapacity metadata` when a product falls
  back — treat that warning as a missing-metadata bug.
- **The old bracket lookup was off by one.** `fees.json` was read with
  `unitVolume < maxQty`, so one kit got the *medium* satchel and ten kits matched
  nothing and fell through to a $5.00 "excess penalty". The brackets here are
  inclusive, so the data now means what it reads.
- **`excessPenalty` is gone.** Overflow opens more large satchels instead of
  describing one impossibly tall one.
- **Australia Post has limits** this code does not enforce: 105 cm max length
  and 0.25 m³ max volume for a regular parcel. A very large order will be quoted
  a parcel Australia Post would reject. Worth adding a guard before we sell
  anything that big.
