# Packaging and shipping dimensions

How the shop turns a cart into one parcel, what that parcel costs to pack, and
which Stripe product metadata it all depends on.

Australia Post prices a parcel on **both** its weight and its size, so getting
the dimensions wrong costs real money in either direction — quote too small and
we absorb the difference, quote too large and the customer is overcharged and
may not buy.

An order can ship as **several parcels**. Nothing is capped and checkout is never
blocked on size: satchels are filled until the next item would overflow one, then
another is opened.

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

## How the shipment is worked out

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

### 5. Every satchel and carton is its own parcel

There is no attempt to merge them. Each satchel and each carton is quoted
separately and the quotes are added up, because that is what actually happens at
the counter: two physical parcels are two postages, and you cannot put a carton
inside a flat satchel.

Identical parcels are quoted once and multiplied, so an order of ten identical
boxes is one request to Australia Post rather than ten.

### 6. Australia Post's limits

Enforced per parcel, from
[Australia Post's size and weight guidelines](https://auspost.com.au/business/shipping/shipping-guidelines/size-weight-guidelines):

| Limit | Value |
| --- | --- |
| Greatest linear dimension | 105 cm |
| Volume | 0.25 m³ |
| Weight | 22 kg |
| Minimum side (box-shaped) | 5 cm on the two smallest sides |

Large orders are **split across more parcels** rather than refused — satchels are
filled until the next item would overflow one by bulk *or* by weight, then a new
one is opened. So there is no cap on order size and no reason to block checkout.

What splitting cannot fix raises an error instead, because it is a data problem
rather than an order problem:

- a carton whose `boxDimensions` exceed the size limits,
- a single item heavier than 22 kg,
- a bagged product with no satchel it fits (`bagCapacity*` all zero).

### 7. Cost

```
postage charged = roundUpTo10c( Σ AusPost quote per parcel + Σ satchel costs + Σ carton costs )
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
without re-deriving anything, the PaymentIntent metadata carries a line per
parcel saying what to reach for, what goes in it, and what to declare:

| Key | Example |
| --- | --- |
| `parcelCount` | `2` |
| `parcel1` | `large satchel \| 10x Ro/Box \| 48.5x36x5cm \| 3000g` |
| `parcel2` | `large satchel \| 1x Ro/Box \| 48.5x36x5cm \| 300g` |
| `packaging` | `2 large satchels` |
| `weightGrams` | `3300` |
| `packagingCents` | `690` |
| `productSummary` | `Ro/Box 10-Pack x 1, Ro/Box x 1` |
| `products` | `{"prod_Rq4KbfaKyka8u5":1,"prod_QYzaVvEwI509MU":1}` |
| `subtotalCents` / `shippingCents` | `36500` / `3890` |

`parcelN` keys stop at 20 to stay inside Stripe's 50-key limit; `parcelCount` is
always exact. These keys are absent, rather than zero, when no shipment was
priced.

---

## Worked examples

Using the current V1 kit (bag, 1/3/10 per satchel, 300 g) and a hypothetical V2
box (24 × 16 × 8, $3.77).

| Cart | Parcels | Packaging |
| --- | --- | --- |
| 1 kit | 1 small satchel — 1 kit, 300 g | $1.65 |
| 3 kits | 1 medium satchel — 3 kits, 900 g | $2.75 |
| 4 kits | 1 large satchel — 4 kits, 1.2 kg | $3.45 |
| 10 kits | 1 large satchel — 10 kits, 3 kg | $3.45 |
| 11 kits | 2 large satchels — 10 kits + 1 kit | $6.90 |
| 1 ten-pack (`combo: 10 kits`) | 1 large satchel — 10 kits, 3 kg | $3.45 |
| 1 ten-pack + 1 kit | 2 large satchels — 10 kits + 1 kit | $6.90 |
| 3 ten-packs | 3 large satchels — 10 kits each | $10.35 |
| 3 V2 boxes | 3 boxes, one kit each | $11.31 |
| 1 kit + 1 V2 box | 1 small satchel + 1 box | $5.42 |

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
- **Volumes are no longer merged.** An earlier version of this code combined
  every satchel and carton into one notional parcel by totalling volume. It
  described something that does not exist and undercharged, since it paid one
  base postage for what ships as several parcels.
- **Shipping is one line to the customer.** However many parcels an order needs,
  Stripe shows a single "Standard shipping" figure — the sum. The split only
  matters to whoever packs it.
- **Weight is distributed, not looked up, inside a bundle.** A bundle's own
  `weight` is divided across the units it expands to. So a parcel's declared
  weight is proportional rather than measured per item; the order total is always
  exact, an individual parcel may be a gram or two out from reality.
