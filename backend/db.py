from dotenv import load_dotenv
load_dotenv()
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import ConnectionFailure
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import os, hashlib, random, secrets

# ── Connection ────────────────────────────────────────────────────────────────

MONGO_URI = os.environ.get(
    "MONGO_URI",
    "mongodb+srv://sarinadfernandez_db_user:<db_password>@franki.txtcxrv.mongodb.net/?appName=Franki"
)
DB_NAME = "franki_db"

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

def ping():
    try:
        client.admin.command("ping")
        print("✅ Connected to MongoDB Atlas")
    except ConnectionFailure:
        print("❌ MongoDB connection failed")


# ── Collections ───────────────────────────────────────────────────────────────

users             = db["users"]
markets           = db["markets"]
bets              = db["bets"]
leaderboards      = db["leaderboards"]
transactions      = db["transactions"]
push_subscriptions = db["push_subscriptions"]
password_resets   = db["password_resets"]


# ── Indexes ───────────────────────────────────────────────────────────────────

def create_indexes():
    users.create_index("auth0_id", unique=True)
    users.create_index("email",    unique=True)
    users.create_index("school")
    users.create_index("graduation_year")

    markets.create_index("status")
    markets.create_index("category")
    markets.create_index("closes_at")

    bets.create_index("user_id")
    bets.create_index("market_id")
    bets.create_index([("user_id", ASCENDING), ("market_id", ASCENDING)])

    leaderboards.create_index("owner_id")
    leaderboards.create_index("name")

    transactions.create_index("user_id")
    transactions.create_index("created_at")

    print("✅ Indexes created")


# ── Achievement rewards ───────────────────────────────────────────────────────

ACHIEVEMENT_REWARDS = {
    "first_bet":      50,
    "market_maven":   100,
    "high_roller":    200,
    "hot_streak":     150,
    "prediction_pro": 500,
    "early_bird":     75,
}

ACHIEVEMENT_LABELS = {
    "first_bet":      "First Bet",
    "market_maven":   "Market Maven",
    "high_roller":    "High Roller",
    "hot_streak":     "Hot Streak",
    "prediction_pro": "Prediction Pro",
    "early_bird":     "Early Bird",
}

ACHIEVEMENT_ICONS = {
    "first_bet":      "🎯",
    "market_maven":   "📊",
    "high_roller":    "👑",
    "hot_streak":     "🔥",
    "prediction_pro": "🔮",
    "early_bird":     "⭐",
}


# ── Schemas (reference) ───────────────────────────────────────────────────────
#
# users: { _id, auth0_id, email, display_name, username, avatar_initials,
#          balance, graduation_year, school, password_hash, created_at, updated_at }
#
# markets: { _id, question, category, icon, status, outcome, yes_price, no_price,
#            volume, watchers, closes_at, created_by, price_history: [{ts, y, n}],
#            created_at, updated_at }
#
# bets: { _id, user_id, market_id, side, price_at_bet, amount, payout, status, placed_at }
#
# leaderboards: { _id, name, owner_id, member_ids, is_public, invite_code, created_at, updated_at }
#
# transactions: { _id, user_id, type, amount, description, market_id, created_at }
#   type: "bet_placed" | "bet_won" | "bet_lost" | "daily_bonus" | "signup_bonus" | "achievement"


# ── Helpers ───────────────────────────────────────────────────────────────────

PENN_SCHOOLS = [
    "School of Engineering and Applied Science",
    "School of Arts & Sciences",
    "The Wharton School",
    "Annenberg School for Communication",
    "Stuart Weitzman School of Design",
    "School of Dental Medicine",
    "Graduate",
    "Penn Carey Law",
    "Perelman School of Medicine",
    "School of Nursing",
    "School of Social Policy and Practice",
    "School of Veterinary Medicine",
]

def now():
    return datetime.now(timezone.utc)

def to_id(id_str):
    try:
        return ObjectId(id_str)
    except Exception:
        return None

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def serialize(doc):
    """Convert a Mongo document to a JSON-safe dict (recursive)."""
    if doc is None:
        return None
    out = {}
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            out[k] = str(v)
        elif isinstance(v, datetime):
            out[k] = v.isoformat()
        elif isinstance(v, list):
            out[k] = [_serialize_value(i) for i in v]
        elif isinstance(v, dict):
            out[k] = serialize(v)
        else:
            out[k] = v
    return out

def _serialize_value(v):
    if isinstance(v, dict):
        return serialize(v)
    elif isinstance(v, ObjectId):
        return str(v)
    elif isinstance(v, datetime):
        return v.isoformat()
    return v


# ── Popularity scoring ────────────────────────────────────────────────────────

def _to_datetime(v):
    """Coerce a value to a timezone-aware datetime, or return None."""
    if v is None:
        return None
    if isinstance(v, str):
        try:
            v = datetime.fromisoformat(v.replace("Z", "+00:00"))
        except ValueError:
            return None
    if isinstance(v, datetime):
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        return v
    return None

def popularity_score(m):
    volume    = m.get("volume", 0)
    watchers  = m.get("watchers", 0) * 100
    created   = _to_datetime(m.get("created_at")) or now()
    age_h     = (now() - created).total_seconds() / 3600
    newness   = max(0, 2000 - age_h * 20)
    urgency   = 0
    closes    = _to_datetime(m.get("closes_at"))
    if closes:
        h_left = (closes - now()).total_seconds() / 3600
        if 0 < h_left <= 24:
            urgency = 500
    return volume + watchers + newness + urgency


# ── Auth helpers ──────────────────────────────────────────────────────────────

def register_user(email, password, display_name, school=None, graduation_year=None):
    """Create a new user with email/password. Returns (user, error)."""
    if users.find_one({"email": email}):
        return None, "Email already registered"
    auth0_id = f"local|{email}"
    initials = "".join(w[0].upper() for w in display_name.split()[:2])
    new_user = {
        "auth0_id":        auth0_id,
        "email":           email,
        "display_name":    display_name,
        "username":        f"@{display_name.lower().replace(' ', '')}",
        "avatar_initials": initials,
        "balance":         1000,
        "graduation_year": graduation_year,
        "school":          school,
        "password_hash":   hash_password(password),
        "created_at":      now(),
        "updated_at":      now(),
    }
    users.insert_one(new_user)
    log_transaction(auth0_id, "signup_bonus", 1000, "Starting Liberty Bucks balance")
    return serialize(new_user), None

def login_user(email, password):
    """Verify credentials. Returns (user, error)."""
    user = users.find_one({"email": email})
    if not user:
        return None, "No account found with that email"
    if user.get("password_hash") != hash_password(password):
        return None, "Incorrect password"
    return serialize(user), None


# ── User helpers ──────────────────────────────────────────────────────────────

def get_or_create_user(auth0_id, email, display_name):
    """Used by Auth0 sync flow."""
    user = users.find_one({"auth0_id": auth0_id})
    if user:
        return serialize(user)
    initials = "".join(w[0].upper() for w in display_name.split()[:2])
    new_user = {
        "auth0_id":        auth0_id,
        "email":           email,
        "display_name":    display_name,
        "username":        f"@{display_name.lower().replace(' ', '')}",
        "avatar_initials": initials,
        "balance":         1000,
        "graduation_year": None,
        "school":          None,
        "password_hash":   None,
        "created_at":      now(),
        "updated_at":      now(),
    }
    users.insert_one(new_user)
    log_transaction(auth0_id, "signup_bonus", 1000, "Starting Liberty Bucks balance")
    return serialize(new_user)

def get_user(user_id):
    return serialize(users.find_one({"auth0_id": user_id}))

def update_user_profile(user_id, updates):
    """Update display_name, school, graduation_year."""
    allowed = {"display_name", "username", "school", "graduation_year"}
    safe = {k: v for k, v in updates.items() if k in allowed}
    if not safe:
        return None, "No valid fields to update"
    safe["updated_at"] = now()
    users.update_one({"auth0_id": user_id}, {"$set": safe})
    return get_user(user_id), None

def get_user_stats(user_id):
    """Compute win rate, total profit, best streak, rank."""
    user_bets = list(bets.find({"user_id": user_id, "status": {"$in": ["won", "lost"]}}))
    total    = len(user_bets)
    won      = sum(1 for b in user_bets if b["status"] == "won")
    win_rate = round(won / total * 100) if total > 0 else 0

    total_wagered = sum(b["amount"] for b in user_bets)
    total_payout  = sum(b.get("payout", 0) or 0 for b in user_bets)
    total_profit  = total_payout - total_wagered

    # Best streak: consecutive wins
    sorted_bets = sorted(user_bets, key=lambda b: b.get("placed_at", now()))
    best_streak = cur_streak = 0
    for b in sorted_bets:
        if b["status"] == "won":
            cur_streak += 1
            best_streak = max(best_streak, cur_streak)
        else:
            cur_streak = 0

    # Global rank by balance
    user = users.find_one({"auth0_id": user_id})
    bal  = user.get("balance", 0) if user else 0
    rank = users.count_documents({"balance": {"$gt": bal}}) + 1

    return {
        "total_bets":    total,
        "won_bets":      won,
        "win_rate":      win_rate,
        "total_profit":  total_profit,
        "total_wagered": total_wagered,
        "best_streak":   best_streak,
        "rank":          rank,
    }


# ── Market helpers ────────────────────────────────────────────────────────────

def generate_fake_price_history(yes_price, n_points=24, hours_back=96):
    """Generate a plausible price history for new markets so the chart looks lived-in."""
    ts = now()
    interval = timedelta(hours=hours_back / n_points)
    start_price = max(5, min(95, yes_price + random.randint(-18, 18)))
    history = []
    current = float(start_price)
    for i in range(n_points):
        t = ts - timedelta(hours=hours_back) + interval * i
        target = yes_price
        current += (target - current) * 0.12 + random.uniform(-2.5, 2.5)
        current = max(5.0, min(95.0, current))
        y = round(current)
        history.append({"ts": t.isoformat(), "y": y, "n": 100 - y})
    history.append({"ts": ts.isoformat(), "y": yes_price, "n": 100 - yes_price})
    return history


def get_open_markets(category=None):
    query = {"status": "open"}
    if category and category != "all":
        # Case-insensitive match so legacy data with wrong casing still filters correctly
        query["category"] = {"$regex": f"^{category.strip()}$", "$options": "i"}
    all_markets = list(markets.find(query))
    all_markets.sort(key=popularity_score, reverse=True)
    return [serialize(m) for m in all_markets]

def get_market(market_id):
    return serialize(markets.find_one({"_id": to_id(market_id)}))

def create_market(question, category, icon, yes_price, no_price, closes_at, created_by):
    ts = now()
    market = {
        "question":      question,
        "category":      category.lower().strip() if category else category,
        "icon":          icon,
        "status":        "open",
        "outcome":       None,
        "yes_price":     yes_price,
        "no_price":      no_price,
        "volume":        1000,
        "watchers":      0,
        "closes_at":     _to_datetime(closes_at) or closes_at,
        "created_by":    created_by,
        "price_history": generate_fake_price_history(yes_price),
        "created_at":    ts,
        "updated_at":    ts,
    }
    result = markets.insert_one(market)
    market["_id"] = str(result.inserted_id)
    return serialize(market)

def resolve_market(market_id, outcome):
    """Resolve a market and pay out winning bets."""
    market = markets.find_one({"_id": to_id(market_id), "status": "open"})
    if not market:
        return None, "Market not found or already resolved"
    if outcome not in ("yes", "no"):
        return None, "Outcome must be 'yes' or 'no'"

    markets.update_one({"_id": to_id(market_id)}, {
        "$set": {"status": "resolved", "outcome": outcome, "updated_at": now()}
    })

    pending = list(bets.find({"market_id": to_id(market_id), "status": "pending"}))
    for bet in pending:
        if bet["side"] == outcome:
            # Payout = amount * (100 / price_at_bet)
            payout = int(bet["amount"] * 100 / bet["price_at_bet"])
            bets.update_one({"_id": bet["_id"]}, {
                "$set": {"status": "won", "payout": payout}
            })
            users.update_one({"auth0_id": bet["user_id"]}, {
                "$inc": {"balance": payout},
                "$set": {"updated_at": now()}
            })
            log_transaction(
                bet["user_id"], "bet_won", payout,
                f"Won market: {market['question'][:40]}",
                market_id=str(market["_id"])
            )
        else:
            bets.update_one({"_id": bet["_id"]}, {
                "$set": {"status": "lost", "payout": 0}
            })
            # No transaction logged — the deduction already happened at bet_placed

    return {"resolved": True, "outcome": outcome, "bets_settled": len(pending)}, None


# ── Bet helpers ───────────────────────────────────────────────────────────────

def place_bet(user_id, market_id, side, amount):
    market = markets.find_one({"_id": to_id(market_id), "status": "open"})
    if not market:
        return None, "Market not found or not open"
    if amount < 10:
        return None, "Minimum bet is 10 LB"

    user = users.find_one({"auth0_id": user_id})
    if not user:
        return None, "User not found"
    if user["balance"] < amount:
        return None, "Insufficient balance"

    price = market["yes_price"] if side == "yes" else market["no_price"]

    bet = {
        "user_id":      user_id,
        "market_id":    to_id(market_id),
        "side":         side,
        "price_at_bet": price,
        "amount":       amount,
        "payout":       None,
        "status":       "pending",
        "placed_at":    now(),
    }
    bets.insert_one(bet)

    users.update_one({"auth0_id": user_id}, {
        "$inc": {"balance": -amount},
        "$set": {"updated_at": now()}
    })

    # Update market: volume, price (slight shift), price history
    shift = min(3, amount // 200)
    if side == "yes":
        new_yes = min(95, market["yes_price"] + shift)
    else:
        new_yes = max(5, market["yes_price"] - shift)
    new_no = 100 - new_yes

    ts = now()
    markets.update_one({"_id": to_id(market_id)}, {
        "$inc": {"volume": amount},
        "$set": {"yes_price": new_yes, "no_price": new_no, "updated_at": ts},
        "$push": {"price_history": {"$each": [{"ts": ts.isoformat(), "y": new_yes, "n": new_no}], "$slice": -200}}
    })

    log_transaction(
        user_id, "bet_placed", -amount,
        f"Bet {side.upper()} on: {market['question'][:40]}",
        market_id=market_id
    )

    return serialize(bet), None

def sell_bet(bet_id, user_id):
    """Sell a pending bet at its current market value.
    Current value = shares * current_price / 100
    where shares = floor(amount * 100 / price_at_bet)  (i.e. the potential payout shares)
    """
    bet = bets.find_one({"_id": to_id(bet_id), "user_id": user_id, "status": "pending"})
    if not bet:
        return None, "Bet not found or not pending"

    market = markets.find_one({"_id": bet["market_id"], "status": "open"})
    if not market:
        return None, "Market is no longer open"

    shares = int(bet["amount"] * 100 / bet["price_at_bet"])
    current_price = market["yes_price"] if bet["side"] == "yes" else market["no_price"]
    sell_value = max(1, int(shares * current_price / 100))

    # Credit user, mark bet sold
    bets.update_one({"_id": to_id(bet_id)}, {
        "$set": {"status": "sold", "payout": sell_value, "sold_at": now()}
    })
    users.update_one({"auth0_id": user_id}, {
        "$inc": {"balance": sell_value},
        "$set": {"updated_at": now()}
    })

    profit = sell_value - bet["amount"]
    log_transaction(
        user_id, "bet_sold", sell_value,
        f"Sold {bet['side'].upper()} position: {market['question'][:40]}",
        market_id=str(market["_id"])
    )

    return {"sell_value": sell_value, "profit": profit}, None


def get_user_bets(user_id):
    user_bets = list(bets.find({"user_id": user_id}).sort("placed_at", DESCENDING))
    result = []
    for b in user_bets:
        sb = serialize(b)
        market = markets.find_one({"_id": to_id(str(b["market_id"]))})
        if market:
            sb["market_question"] = market["question"]
            sb["market_icon"]     = market.get("icon", "📊")
            sb["market_category"] = market.get("category", "")
            sb["market_status"]   = market.get("status", "open")
            sb["market_outcome"]  = market.get("outcome")
            # For pending bets, attach current market value
            if b["status"] == "pending" and market.get("status") == "open":
                shares = int(b["amount"] * 100 / b["price_at_bet"])
                current_price = market["yes_price"] if b["side"] == "yes" else market["no_price"]
                sb["current_value"] = max(1, int(shares * current_price / 100))
                sb["current_price"] = current_price
                sb["shares"] = shares
        result.append(sb)
    return result


# ── Transaction helpers ───────────────────────────────────────────────────────

def log_transaction(user_id, tx_type, amount, description, market_id=None):
    transactions.insert_one({
        "user_id":     user_id,
        "type":        tx_type,
        "amount":      amount,
        "description": description,
        "market_id":   market_id,
        "created_at":  now(),
    })

def get_user_transactions(user_id, limit=20):
    return [serialize(t) for t in
            transactions.find({"user_id": user_id})
            .sort("created_at", DESCENDING)
            .limit(limit)]


# ── Leaderboard helpers ───────────────────────────────────────────────────────

def get_global_leaderboard(limit=50):
    top = list(users.find(
        {},
        {"auth0_id": 1, "display_name": 1, "username": 1, "avatar_initials": 1,
         "balance": 1, "school": 1, "graduation_year": 1}
    ).sort("balance", DESCENDING).limit(limit))
    return [serialize(u) for u in top]

def get_school_leaderboard(school, limit=50):
    top = list(users.find(
        {"school": school},
        {"auth0_id": 1, "display_name": 1, "username": 1, "avatar_initials": 1,
         "balance": 1, "school": 1, "graduation_year": 1}
    ).sort("balance", DESCENDING).limit(limit))
    return [serialize(u) for u in top]

def get_year_leaderboard(year, limit=50):
    top = list(users.find(
        {"graduation_year": int(year)},
        {"auth0_id": 1, "display_name": 1, "username": 1, "avatar_initials": 1,
         "balance": 1, "school": 1, "graduation_year": 1}
    ).sort("balance", DESCENDING).limit(limit))
    return [serialize(u) for u in top]

def get_leaderboard_rankings(leaderboard_id):
    board = leaderboards.find_one({"_id": to_id(leaderboard_id)})
    if not board:
        return None, "Leaderboard not found"
    members = list(users.find(
        {"auth0_id": {"$in": board["member_ids"]}},
        {"auth0_id": 1, "display_name": 1, "username": 1, "avatar_initials": 1, "balance": 1}
    ).sort("balance", DESCENDING))
    return {
        "leaderboard": serialize(board),
        "rankings":    [serialize(m) for m in members]
    }, None


# ── Achievement helpers ───────────────────────────────────────────────────────

def check_and_grant_achievements(user_id):
    """Check which achievements the user has newly earned. Grant LB rewards for new ones.
    Returns list of newly granted achievements (for notification display)."""
    user = users.find_one({"auth0_id": user_id})
    if not user:
        return []

    already_granted = set(user.get("achievements_granted", []))
    stats = get_user_stats(user_id)
    total_bets = stats["total_bets"]

    # Compute which should be unlocked now
    should_have = set()
    if total_bets >= 1:
        should_have.add("first_bet")
    if total_bets >= 10:
        should_have.add("market_maven")
    if stats["total_wagered"] >= 1000:
        should_have.add("high_roller")
    if stats["best_streak"] >= 3:
        should_have.add("hot_streak")
    if stats["win_rate"] >= 75 and total_bets >= 20:
        should_have.add("prediction_pro")
    # early_bird: user placed a bet on a market with < 100 total bets at placement time
    # (approximated: if any of their bets is among the first 100 on that market)
    user_bet_market_ids = [b["market_id"] for b in bets.find({"user_id": user_id})]
    for mid in user_bet_market_ids:
        count = bets.count_documents({"market_id": mid})
        if count <= 100:
            should_have.add("early_bird")
            break

    new_achievements = should_have - already_granted
    newly_granted = []

    for ach_id in new_achievements:
        reward = ACHIEVEMENT_REWARDS.get(ach_id, 0)
        users.update_one({"auth0_id": user_id}, {
            "$addToSet": {"achievements_granted": ach_id},
            "$inc":      {"balance": reward},
            "$set":      {"updated_at": now()}
        })
        if reward > 0:
            log_transaction(
                user_id, "achievement", reward,
                f"Achievement: {ACHIEVEMENT_LABELS.get(ach_id, ach_id)}"
            )
        newly_granted.append({
            "id":     ach_id,
            "label":  ACHIEVEMENT_LABELS.get(ach_id, ach_id),
            "icon":   ACHIEVEMENT_ICONS.get(ach_id, "🏆"),
            "reward": reward,
        })

    return newly_granted


# ── Market submission & review ────────────────────────────────────────────────

QUESTION_TYPES = ["yes_no", "over_under", "date_based"]

def submit_market_for_review(question, category, icon, question_type, yes_price, closes_at, created_by):
    """Student-submitted market — goes into pending_review, not visible until approved."""
    yes_price = max(5, min(95, int(yes_price)))
    ts = now()
    market = {
        "question":          question,
        "category":          category.lower().strip() if category else category,
        "icon":              icon,
        "question_type":     question_type,
        "status":            "pending_review",
        "outcome":           None,
        "yes_price":         yes_price,
        "no_price":          100 - yes_price,
        "volume":            1000,
        "watchers":          0,
        "closes_at":         _to_datetime(closes_at) or closes_at,
        "created_by":        created_by,
        "price_history":     generate_fake_price_history(yes_price),
        "rejection_reason":  None,
        "created_at":        ts,
        "updated_at":        ts,
    }
    result = markets.insert_one(market)
    market["_id"] = str(result.inserted_id)
    return serialize(market)

def get_pending_markets():
    return [serialize(m) for m in
            markets.find({"status": "pending_review"}).sort("created_at", DESCENDING)]

def approve_market(market_id):
    market = markets.find_one({"_id": to_id(market_id)})
    if not market:
        return None, "Market not found"
    markets.update_one({"_id": to_id(market_id)}, {
        "$set": {"status": "open", "updated_at": now()}
    })
    return get_market(market_id), None

def reject_market(market_id, reason=""):
    market = markets.find_one({"_id": to_id(market_id)})
    if not market:
        return None, "Market not found"
    markets.update_one({"_id": to_id(market_id)}, {
        "$set": {"status": "rejected", "rejection_reason": reason, "updated_at": now()}
    })
    return {"rejected": True}, None


# ── Daily bonus ───────────────────────────────────────────────────────────────

DAILY_BONUS_AMOUNT = 25

def claim_daily_bonus(user_id):
    """Grant 25 LB once per calendar day. Returns (result, error)."""
    user = users.find_one({"auth0_id": user_id})
    if not user:
        return None, "User not found"

    today = datetime.now(timezone.utc).date()
    last  = user.get("last_daily_bonus")
    if last:
        if isinstance(last, str):
            last = datetime.fromisoformat(last).date()
        elif isinstance(last, datetime):
            last = last.date()
        if last >= today:
            return {"already_claimed": True, "bonus": 0}, None

    users.update_one({"auth0_id": user_id}, {
        "$inc": {"balance": DAILY_BONUS_AMOUNT},
        "$set": {"last_daily_bonus": now(), "updated_at": now()}
    })
    log_transaction(user_id, "daily_bonus", DAILY_BONUS_AMOUNT, "Daily login bonus 🎁")
    return {"already_claimed": False, "bonus": DAILY_BONUS_AMOUNT}, None


# ── Social: follow / feed ─────────────────────────────────────────────────────

def follow_user(follower_id, target_id):
    if follower_id == target_id:
        return None, "Cannot follow yourself"
    target = users.find_one({"auth0_id": target_id})
    if not target:
        return None, "User not found"
    users.update_one({"auth0_id": follower_id}, {"$addToSet": {"following": target_id}})
    users.update_one({"auth0_id": target_id},   {"$addToSet": {"followers": follower_id}})
    return {"following": True}, None

def unfollow_user(follower_id, target_id):
    users.update_one({"auth0_id": follower_id}, {"$pull": {"following": target_id}})
    users.update_one({"auth0_id": target_id},   {"$pull": {"followers": follower_id}})
    return {"following": False}, None

def get_follow_status(viewer_id, target_id):
    viewer = users.find_one({"auth0_id": viewer_id})
    return target_id in (viewer.get("following") or []) if viewer else False

def get_social_feed(user_id, limit=30):
    """Recent bets placed by users that user_id follows."""
    user = users.find_one({"auth0_id": user_id})
    if not user:
        return []
    following = user.get("following") or []
    if not following:
        return []
    feed = list(bets.find({"user_id": {"$in": following}})
                    .sort("placed_at", DESCENDING).limit(limit))
    result = []
    for b in feed:
        sb = serialize(b)
        bettor = users.find_one({"auth0_id": b["user_id"]},
                                {"display_name": 1, "avatar_initials": 1, "username": 1})
        if bettor:
            sb["bettor_name"]     = bettor.get("display_name", "Unknown")
            sb["bettor_initials"] = bettor.get("avatar_initials", "?")
            sb["bettor_username"] = bettor.get("username", "")
        market = markets.find_one({"_id": to_id(str(b["market_id"]))})
        if market:
            sb["market_question"] = market["question"]
            sb["market_icon"]     = market.get("icon", "📊")
            sb["market_category"] = market.get("category", "")
        result.append(sb)
    return result


# ── Push notification helpers ─────────────────────────────────────────────────

def save_push_subscription(user_id, subscription):
    push_subscriptions.update_one(
        {"user_id": user_id},
        {"$set": {"user_id": user_id, "subscription": subscription, "updated_at": now()}},
        upsert=True
    )

def send_push_to_user(user_id, title, body, url="/", tag="franki"):
    """Send a web push notification to a single user."""
    import os, json
    from pywebpush import webpush, WebPushException

    private_key = os.environ.get("VAPID_PRIVATE_KEY", "")
    claims_email = os.environ.get("VAPID_CLAIMS_EMAIL", "admin@franki.app")
    if not private_key:
        return

    import base64
    private_pem = base64.urlsafe_b64decode(private_key + "==")

    sub_doc = push_subscriptions.find_one({"user_id": user_id})
    if not sub_doc:
        return
    subscription = sub_doc["subscription"]
    payload = json.dumps({"title": title, "body": body, "url": url, "tag": tag})
    try:
        webpush(
            subscription_info=subscription,
            data=payload,
            vapid_private_key=private_pem,
            vapid_claims={"sub": f"mailto:{claims_email}"},
        )
    except WebPushException:
        pass  # subscription expired or invalid


def notify_bet_winners(market_id, outcome):
    """Notify all bettors of a resolved market."""
    market = markets.find_one({"_id": to_id(market_id)})
    if not market:
        return
    q = market["question"][:50]
    winning_bets = list(bets.find({"market_id": to_id(market_id), "side": outcome}))
    losing_bets  = list(bets.find({"market_id": to_id(market_id), "side": {"$ne": outcome}}))
    for b in winning_bets:
        send_push_to_user(b["user_id"], "🏆 You won!", f"{q}", url="/", tag="bet-won")
    for b in losing_bets:
        send_push_to_user(b["user_id"], "Better luck next time", f"{q} resolved {outcome.upper()}", url="/", tag="bet-lost")


# ── Password reset ────────────────────────────────────────────────────────────

def generate_reset_token(email):
    """Create a 1-hour reset token for the given email. Returns (token, error)."""
    user = users.find_one({"email": email})
    if not user:
        return None, "No account found with that email"
    token = secrets.token_urlsafe(32)
    password_resets.update_one(
        {"email": email},
        {"$set": {"token": token, "email": email, "expires_at": now() + timedelta(hours=1), "created_at": now()}},
        upsert=True,
    )
    return token, None

def reset_password_with_token(token, new_password):
    """Validate reset token and set new password. Returns (result, error)."""
    if not token or not new_password:
        return None, "Token and new password are required"
    reset = password_resets.find_one({"token": token})
    if not reset:
        return None, "Invalid or expired reset token"
    if reset["expires_at"] < now():
        password_resets.delete_one({"token": token})
        return None, "Reset token has expired"
    users.update_one(
        {"email": reset["email"]},
        {"$set": {"password_hash": hash_password(new_password), "updated_at": now()}}
    )
    password_resets.delete_one({"token": token})
    return {"success": True}, None


# ── Followers / following ─────────────────────────────────────────────────────

def get_user_followers(user_id):
    user = users.find_one({"auth0_id": user_id})
    if not user:
        return []
    ids = user.get("followers") or []
    result = list(users.find(
        {"auth0_id": {"$in": ids}},
        {"auth0_id": 1, "display_name": 1, "username": 1, "avatar_initials": 1, "balance": 1}
    ))
    return [serialize(u) for u in result]

def get_user_following(user_id):
    user = users.find_one({"auth0_id": user_id})
    if not user:
        return []
    ids = user.get("following") or []
    result = list(users.find(
        {"auth0_id": {"$in": ids}},
        {"auth0_id": 1, "display_name": 1, "username": 1, "avatar_initials": 1, "balance": 1}
    ))
    return [serialize(u) for u in result]


# ── Admin analytics ───────────────────────────────────────────────────────────

def get_admin_analytics():
    from collections import defaultdict

    total_markets    = markets.count_documents({})
    open_markets     = markets.count_documents({"status": "open"})
    pending_review   = markets.count_documents({"status": "pending_review"})
    total_bets_count = bets.count_documents({})
    total_users_count = users.count_documents({"role": {"$ne": "admin"}})

    # Total LB in circulation
    agg = list(users.aggregate([{"$group": {"_id": None, "total": {"$sum": "$balance"}}}]))
    total_lb = agg[0]["total"] if agg else 0

    # Volume by category
    cat_agg = list(markets.aggregate([
        {"$group": {"_id": "$category", "volume": {"$sum": "$volume"}, "count": {"$sum": 1}}},
        {"$sort": {"volume": -1}}
    ]))

    # Top bettors by activity
    bettor_agg = list(bets.aggregate([
        {"$group": {"_id": "$user_id", "bet_count": {"$sum": 1}, "total_wagered": {"$sum": "$amount"}}},
        {"$sort": {"bet_count": -1}},
        {"$limit": 8}
    ]))
    for b in bettor_agg:
        u = users.find_one({"auth0_id": b["_id"]}, {"display_name": 1, "avatar_initials": 1})
        b["display_name"]    = u.get("display_name", "Unknown") if u else "Unknown"
        b["avatar_initials"] = u.get("avatar_initials", "?")    if u else "?"

    # Top markets by volume
    top_markets_data = [serialize(m) for m in
        markets.find({"status": "open"}, {"question": 1, "volume": 1, "category": 1, "icon": 1})
               .sort("volume", DESCENDING).limit(6)]

    # Bets placed per day (last 7 days)
    from datetime import timedelta
    daily_counts = []
    for i in range(6, -1, -1):
        day_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=i)
        day_end   = day_start + timedelta(days=1)
        count = bets.count_documents({"placed_at": {"$gte": day_start, "$lt": day_end}})
        daily_counts.append({"date": day_start.strftime("%a"), "count": count})

    return {
        "total_markets":     total_markets,
        "open_markets":      open_markets,
        "pending_review":    pending_review,
        "total_bets":        total_bets_count,
        "total_users":       total_users_count,
        "total_lb":          total_lb,
        "category_stats":    cat_agg,
        "top_bettors":       bettor_agg,
        "top_markets":       top_markets_data,
        "daily_counts":      daily_counts,
    }
