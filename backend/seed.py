"""
seed.py — Populate franki_db with demo markets for local testing.
Clears all markets, bets, and transactions, then re-inserts markets only.
"""

from db import (
    markets, users, bets, transactions,
    hash_password, now, serialize, to_id
)
from datetime import datetime, timezone, timedelta
from bson import ObjectId

def dt(offset_days=0, hour=17, minute=0):
    """UTC datetime offset from today."""
    base = datetime.now(timezone.utc).replace(hour=hour, minute=minute, second=0, microsecond=0)
    return base + timedelta(days=offset_days)

def price_history(yes_start, points=12, trend="flat"):
    """Generate a plausible price history list."""
    import random
    hist = []
    y = yes_start
    for i in range(points):
        if trend == "up":
            y = min(95, y + random.randint(0, 3))
        elif trend == "down":
            y = max(5, y - random.randint(0, 3))
        else:
            y = max(5, min(95, y + random.randint(-2, 2)))
        n = 100 - y
        ts = (datetime.now(timezone.utc) - timedelta(hours=points - i)).isoformat()
        hist.append({"ts": ts, "y": y, "n": n})
    return hist


# ── Clear existing data ───────────────────────────────────────────────────────

markets.delete_many({})
bets.delete_many({})
transactions.delete_many({})
users.delete_many({"auth0_id": {"$regex": "^local\\|"}})   # only clear local users

print("🧹 Cleared existing data")


# ── Admin user ────────────────────────────────────────────────────────────────

admin_user = {
    "auth0_id":        "local|admin@franki.app",
    "email":           "admin@franki.app",
    "display_name":    "Franki Admin",
    "username":        "@admin",
    "avatar_initials": "FA",
    "balance":         0,
    "graduation_year": None,
    "school":          None,
    "role":            "admin",
    "password_hash":   hash_password("franki_admin_2026"),
    "created_at":      dt(-60),
    "updated_at":      dt(-1),
}

users.insert_one(admin_user)
print("✅ Inserted admin user")


# ── Markets (current as of April 19, 2026) ────────────────────────────────────
# Weather: partly sunny w/ scattered showers today, highs in lower 80s;
# later this week upper 50s with 80% rain chance.
# Spring Fling already happened Apr 17 (Flo Rida headlined).
# Women's lacrosse home games: Towson Apr 22, Brown Apr 26 at Franklin Field.
# Penn Symphony Orchestra: Apr 24 at 8pm, Irvine Auditorium.
# Earth Week runs through Apr 24.

market_docs = [
    # ── WEATHER ──────────────────────────────────────────────────────────────
    {
        "question":      "Will Philadelphia see rain before midnight on Wednesday, April 22nd?",
        "category":      "weather",
        "icon":          "🌧️",
        "status":        "open",
        "outcome":       None,
        "yes_price":     78,
        "no_price":      22,
        "volume":        2100,
        "watchers":      17,
        "closes_at":     dt(3, hour=23),
        "created_by":    "admin",
        "price_history": price_history(70, points=12, trend="up"),
        "created_at":    dt(-1),
        "updated_at":    now(),
    },
    {
        "question":      "Will Philly's high temperature stay below 65°F on Wednesday, April 22nd?",
        "category":      "weather",
        "icon":          "🌡️",
        "status":        "open",
        "outcome":       None,
        "yes_price":     64,
        "no_price":      36,
        "volume":        1450,
        "watchers":      11,
        "closes_at":     dt(3, hour=20),
        "created_by":    "admin",
        "price_history": price_history(55, points=10, trend="up"),
        "created_at":    dt(-1),
        "updated_at":    now(),
    },
    {
        "question":      "Will Penn's campus see thunderstorms before Sunday, April 26th?",
        "category":      "weather",
        "icon":          "⛈️",
        "status":        "open",
        "outcome":       None,
        "yes_price":     65,
        "no_price":      35,
        "volume":        1800,
        "watchers":      14,
        "closes_at":     dt(7, hour=23),
        "created_by":    "admin",
        "price_history": price_history(58, points=8, trend="up"),
        "created_at":    dt(-1),
        "updated_at":    now(),
    },
    {
        "question":      "Will Philadelphia get more than 1 inch of rain this week?",
        "category":      "weather",
        "icon":          "☔",
        "status":        "open",
        "outcome":       None,
        "yes_price":     52,
        "no_price":      48,
        "volume":        1200,
        "watchers":      9,
        "closes_at":     dt(6, hour=23),
        "created_by":    "admin",
        "price_history": price_history(48, points=8, trend="flat"),
        "created_at":    dt(-1),
        "updated_at":    now(),
    },
    {
        "question":      "Will it hit 80°F on Penn's campus again before April 30th?",
        "category":      "weather",
        "icon":          "☀️",
        "status":        "open",
        "outcome":       None,
        "yes_price":     42,
        "no_price":      58,
        "volume":        980,
        "watchers":      8,
        "closes_at":     dt(11, hour=23),
        "created_by":    "admin",
        "price_history": price_history(50, points=10, trend="down"),
        "created_at":    dt(-2),
        "updated_at":    dt(-1),
    },
    {
        "question":      "Will April 2026 end as an above-average temperature month for Philadelphia?",
        "category":      "weather",
        "icon":          "🌤️",
        "status":        "open",
        "outcome":       None,
        "yes_price":     61,
        "no_price":      39,
        "volume":        870,
        "watchers":      6,
        "closes_at":     dt(11, hour=23),
        "created_by":    "admin",
        "price_history": price_history(55, points=8, trend="up"),
        "created_at":    dt(-3),
        "updated_at":    dt(-1),
    },
    {
        "question":      "Will it be warm enough for College Green sunbathing this weekend (Apr 19-20)?",
        "category":      "weather",
        "icon":          "🌞",
        "status":        "open",
        "outcome":       None,
        "yes_price":     55,
        "no_price":      45,
        "volume":        760,
        "watchers":      12,
        "closes_at":     dt(1, hour=20),
        "created_by":    "admin",
        "price_history": price_history(50, points=6, trend="flat"),
        "created_at":    dt(-1),
        "updated_at":    now(),
    },
    # ── SPORTS ───────────────────────────────────────────────────────────────
    {
        "question":      "Will Penn Women's Lacrosse beat Towson at Franklin Field on April 22nd?",
        "category":      "sports",
        "icon":          "🥍",
        "status":        "open",
        "outcome":       None,
        "yes_price":     65,
        "no_price":      35,
        "volume":        2400,
        "watchers":      16,
        "closes_at":     dt(3, hour=13),
        "created_by":    "admin",
        "price_history": price_history(58, points=12, trend="up"),
        "created_at":    dt(-2),
        "updated_at":    dt(-1),
    },
    {
        "question":      "Will Penn Women's Lacrosse beat Brown in their home finale on April 26th?",
        "category":      "sports",
        "icon":          "🥍",
        "status":        "open",
        "outcome":       None,
        "yes_price":     58,
        "no_price":      42,
        "volume":        1600,
        "watchers":      10,
        "closes_at":     dt(7, hour=14),
        "created_by":    "admin",
        "price_history": price_history(52, points=8, trend="flat"),
        "created_at":    dt(-2),
        "updated_at":    dt(-1),
    },
    {
        "question":      "Will Penn Men's Lacrosse finish the regular season with a winning Ivy record?",
        "category":      "sports",
        "icon":          "🥍",
        "status":        "open",
        "outcome":       None,
        "yes_price":     53,
        "no_price":      47,
        "volume":        1900,
        "watchers":      13,
        "closes_at":     dt(11, hour=23),
        "created_by":    "admin",
        "price_history": price_history(50, points=10, trend="flat"),
        "created_at":    dt(-3),
        "updated_at":    dt(-1),
    },
    {
        "question":      "Will Penn Baseball win their next Ivy series?",
        "category":      "sports",
        "icon":          "⚾",
        "status":        "open",
        "outcome":       None,
        "yes_price":     55,
        "no_price":      45,
        "volume":        1300,
        "watchers":      9,
        "closes_at":     dt(7, hour=18),
        "created_by":    "admin",
        "price_history": price_history(50, points=8, trend="flat"),
        "created_at":    dt(-2),
        "updated_at":    dt(-1),
    },
    # ── EVENTS ───────────────────────────────────────────────────────────────
    {
        "question":      "Will Penn Symphony Orchestra sell out Irvine Auditorium on April 24th?",
        "category":      "events",
        "icon":          "🎻",
        "status":        "open",
        "outcome":       None,
        "yes_price":     38,
        "no_price":      62,
        "volume":        650,
        "watchers":      7,
        "closes_at":     dt(5, hour=20),
        "created_by":    "admin",
        "price_history": price_history(40, points=6, trend="flat"),
        "created_at":    dt(-2),
        "updated_at":    dt(-1),
    },
    {
        "question":      "Will Earth Week 2026 events fill Houston Hall's main space?",
        "category":      "events",
        "icon":          "🌱",
        "status":        "open",
        "outcome":       None,
        "yes_price":     44,
        "no_price":      56,
        "volume":        540,
        "watchers":      5,
        "closes_at":     dt(5, hour=22),
        "created_by":    "admin",
        "price_history": price_history(42, points=6, trend="flat"),
        "created_at":    dt(-2),
        "updated_at":    dt(-1),
    },
    # ── CAMPUS / FIRE ALARMS ──────────────────────────────────────────────────
    {
        "question":      "Will Rodin College House have a fire alarm this week?",
        "category":      "campus",
        "icon":          "🚨",
        "status":        "open",
        "outcome":       None,
        "yes_price":     35,
        "no_price":      65,
        "volume":        820,
        "watchers":      11,
        "closes_at":     dt(6, hour=23),
        "created_by":    "admin",
        "price_history": price_history(38, points=8, trend="down"),
        "created_at":    dt(-1),
        "updated_at":    now(),
    },
    {
        "question":      "Will Harrison College House have a fire alarm this week?",
        "category":      "campus",
        "icon":          "🚨",
        "status":        "open",
        "outcome":       None,
        "yes_price":     30,
        "no_price":      70,
        "volume":        740,
        "watchers":      9,
        "closes_at":     dt(6, hour=23),
        "created_by":    "admin",
        "price_history": price_history(33, points=8, trend="down"),
        "created_at":    dt(-1),
        "updated_at":    now(),
    },
    {
        "question":      "Will Harnwell College House have a fire alarm this week?",
        "category":      "campus",
        "icon":          "🚨",
        "status":        "open",
        "outcome":       None,
        "yes_price":     32,
        "no_price":      68,
        "volume":        690,
        "watchers":      8,
        "closes_at":     dt(6, hour=23),
        "created_by":    "admin",
        "price_history": price_history(36, points=8, trend="down"),
        "created_at":    dt(-1),
        "updated_at":    now(),
    },
    {
        "question":      "Will the Van Pelt elevator be fixed before finals week?",
        "category":      "campus",
        "icon":          "🏛️",
        "status":        "open",
        "outcome":       None,
        "yes_price":     24,
        "no_price":      76,
        "volume":        1100,
        "watchers":      6,
        "closes_at":     dt(16, hour=23),
        "created_by":    "admin",
        "price_history": price_history(30, points=8, trend="down"),
        "created_at":    dt(-5),
        "updated_at":    dt(-2),
    },
    # ── ACADEMICS ────────────────────────────────────────────────────────────
    {
        "question":      "Will the CIS 3200 (Algorithms) final have a curve this semester?",
        "category":      "academics",
        "icon":          "📚",
        "status":        "open",
        "outcome":       None,
        "yes_price":     48,
        "no_price":      52,
        "volume":        1450,
        "watchers":      8,
        "closes_at":     dt(21, hour=17),
        "created_by":    "admin",
        "price_history": price_history(50, points=8, trend="flat"),
        "created_at":    dt(-4),
        "updated_at":    dt(-1),
    },
    # ── ELECTIONS ────────────────────────────────────────────────────────────
    {
        "question":      "Will Penn's UA release their spring survey results before May 1st?",
        "category":      "elections",
        "icon":          "🗳️",
        "status":        "open",
        "outcome":       None,
        "yes_price":     44,
        "no_price":      56,
        "volume":        530,
        "watchers":      4,
        "closes_at":     dt(12, hour=18),
        "created_by":    "admin",
        "price_history": price_history(50, points=6, trend="flat"),
        "created_at":    dt(-3),
        "updated_at":    dt(-1),
    },
]

result = markets.insert_many(market_docs)
print(f"✅ Inserted {len(market_docs)} markets")
print()
print("🔑 Admin login:")
print("   Email: admin@franki.app   Password: franki_admin_2026")
print()
print("✅ Seed complete!")
