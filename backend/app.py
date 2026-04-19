from flask import Flask, jsonify, request, g
from flask_cors import CORS
from db import (
    ping, create_indexes, now, serialize, users, to_id,
    register_user, login_user, get_or_create_user, get_user, update_user_profile,
    get_user_stats, get_user_transactions,
    get_open_markets, get_market, create_market, resolve_market,
    place_bet, get_user_bets, sell_bet,
    get_global_leaderboard, get_school_leaderboard, get_year_leaderboard,
    get_leaderboard_rankings, leaderboards, PENN_SCHOOLS,
    log_transaction,
    check_and_grant_achievements,
    submit_market_for_review, get_pending_markets, approve_market, reject_market,
    QUESTION_TYPES,
    claim_daily_bonus,
    follow_user, unfollow_user, get_follow_status, get_social_feed,
    save_push_subscription, notify_bet_winners,
    get_admin_analytics,
)
import random, string
from functools import wraps

app = Flask(__name__)
CORS(app)

ping()
create_indexes()

# ── Auth middleware ───────────────────────────────────────────────────────────

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"error": "Unauthorized"}), 401
        g.user_id = auth.replace("Bearer ", "").strip()
        return f(*args, **kwargs)
    return decorated

def require_admin(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"error": "Unauthorized"}), 401
        user_id = auth.replace("Bearer ", "").strip()
        user = users.find_one({"auth0_id": user_id})
        if not user or user.get("role") != "admin":
            return jsonify({"error": "Admin access required"}), 403
        g.user_id = user_id
        return f(*args, **kwargs)
    return decorated

# ── Health ────────────────────────────────────────────────────────────────────

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})

# ── Auth ──────────────────────────────────────────────────────────────────────

@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.json
    if not data or not data.get("email") or not data.get("password") or not data.get("display_name"):
        return jsonify({"error": "email, password and display_name are required"}), 400
    user, err = register_user(
        email=data["email"],
        password=data["password"],
        display_name=data["display_name"],
        school=data.get("school"),
        graduation_year=data.get("graduation_year")
    )
    if err:
        return jsonify({"error": err}), 409
    token = user["auth0_id"]
    return jsonify({"success": True, "user": user, "token": token}), 201

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.json
    if not data or not data.get("email") or not data.get("password"):
        return jsonify({"error": "email and password are required"}), 400
    user, err = login_user(data["email"], data["password"])
    if err:
        return jsonify({"error": err}), 401
    token = user["auth0_id"]
    return jsonify({"success": True, "user": user, "token": token})

@app.route("/api/auth/sync", methods=["POST"])
def sync_user():
    """Auth0 login sync (legacy)."""
    data = request.json
    user = get_or_create_user(
        auth0_id=data["auth0_id"],
        email=data["email"],
        display_name=data.get("display_name", data["email"].split("@")[0])
    )
    return jsonify(user)

# ── Current user ──────────────────────────────────────────────────────────────

@app.route("/api/users/me", methods=["GET"])
@require_auth
def get_me():
    user = get_user(g.user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user)

@app.route("/api/users/me", methods=["PATCH"])
@require_auth
def update_me():
    data = request.json or {}
    user, err = update_user_profile(g.user_id, data)
    if err:
        return jsonify({"error": err}), 400
    return jsonify(user)

@app.route("/api/users/me/stats", methods=["GET"])
@require_auth
def my_stats():
    return jsonify(get_user_stats(g.user_id))

# ── Penn schools list ─────────────────────────────────────────────────────────

@app.route("/api/schools", methods=["GET"])
def get_schools():
    return jsonify(PENN_SCHOOLS)

# ── Markets ───────────────────────────────────────────────────────────────────

@app.route("/api/markets", methods=["GET"])
def get_markets():
    category = request.args.get("category", "all")
    return jsonify(get_open_markets(category))

@app.route("/api/markets/<market_id>", methods=["GET"])
def get_one_market(market_id):
    market = get_market(market_id)
    if not market:
        return jsonify({"error": "Not found"}), 404
    return jsonify(market)

@app.route("/api/markets", methods=["POST"])
@require_auth
def new_market():
    data = request.json
    required = ("question", "category", "yes_price", "closes_at")
    for f in required:
        if f not in data:
            return jsonify({"error": f"Missing field: {f}"}), 400
    yes_price = int(data["yes_price"])
    no_price  = 100 - yes_price
    market = create_market(
        question=data["question"],
        category=data["category"],
        icon=data.get("icon", "📊"),
        yes_price=yes_price,
        no_price=no_price,
        closes_at=data["closes_at"],
        created_by=g.user_id
    )
    return jsonify(market), 201

@app.route("/api/markets/<market_id>/resolve", methods=["POST"])
@require_auth
def resolve(market_id):
    data = request.json or {}
    result, err = resolve_market(market_id, data.get("outcome"))
    if err:
        return jsonify({"error": err}), 400
    return jsonify(result)

@app.route("/api/markets/<market_id>/watch", methods=["POST"])
@require_auth
def watch_market(market_id):
    from db import markets, to_id
    markets.update_one({"_id": to_id(market_id)}, {"$inc": {"watchers": 1}})
    return jsonify({"watched": True})

# ── Bets ──────────────────────────────────────────────────────────────────────

@app.route("/api/bets", methods=["POST"])
@require_auth
def make_bet():
    data = request.json
    bet, error = place_bet(
        user_id=g.user_id,
        market_id=data["market_id"],
        side=data["side"],
        amount=int(data["amount"])
    )
    if error:
        return jsonify({"error": error}), 400
    return jsonify(bet), 201

@app.route("/api/bets/mine", methods=["GET"])
@require_auth
def my_bets():
    return jsonify(get_user_bets(g.user_id))

@app.route("/api/bets/<bet_id>/sell", methods=["POST"])
@require_auth
def sell_position(bet_id):
    result, error = sell_bet(bet_id, g.user_id)
    if error:
        return jsonify({"error": error}), 400
    return jsonify(result)

# ── Transactions ──────────────────────────────────────────────────────────────

@app.route("/api/transactions/mine", methods=["GET"])
@require_auth
def my_transactions():
    limit = int(request.args.get("limit", 20))
    return jsonify(get_user_transactions(g.user_id, limit))

# ── Leaderboards (global / school / year) ────────────────────────────────────

@app.route("/api/leaderboard/global", methods=["GET"])
def global_leaderboard():
    limit = int(request.args.get("limit", 50))
    return jsonify(get_global_leaderboard(limit))

@app.route("/api/leaderboard/school", methods=["GET"])
def school_leaderboard():
    school = request.args.get("school")
    if not school:
        return jsonify({"error": "school param required"}), 400
    return jsonify(get_school_leaderboard(school))

@app.route("/api/leaderboard/year", methods=["GET"])
def year_leaderboard():
    year = request.args.get("year")
    if not year:
        return jsonify({"error": "year param required"}), 400
    try:
        year = int(year)
    except ValueError:
        return jsonify({"error": "year must be an integer"}), 400
    return jsonify(get_year_leaderboard(year))

# ── Custom leaderboards ───────────────────────────────────────────────────────

@app.route("/api/leaderboards", methods=["POST"])
@require_auth
def create_leaderboard():
    data = request.json
    invite_code = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    board = {
        "name":        data["name"],
        "owner_id":    g.user_id,
        "member_ids":  [g.user_id],
        "is_public":   data.get("is_public", False),
        "invite_code": invite_code,
        "created_at":  now(),
        "updated_at":  now(),
    }
    result = leaderboards.insert_one(board)
    board["_id"] = str(result.inserted_id)
    return jsonify(serialize(board)), 201

@app.route("/api/leaderboards/join/<invite_code>", methods=["POST"])
@require_auth
def join_leaderboard(invite_code):
    board = leaderboards.find_one({"invite_code": invite_code})
    if not board:
        return jsonify({"error": "Invalid invite code"}), 404
    leaderboards.update_one(
        {"_id": board["_id"]},
        {"$addToSet": {"member_ids": g.user_id}, "$set": {"updated_at": now()}}
    )
    return jsonify({"message": "Joined", "leaderboard_id": str(board["_id"])})

@app.route("/api/leaderboards/<leaderboard_id>", methods=["GET"])
@require_auth
def get_leaderboard(leaderboard_id):
    result, error = get_leaderboard_rankings(leaderboard_id)
    if error:
        return jsonify({"error": error}), 404
    return jsonify(result)

@app.route("/api/leaderboards/mine", methods=["GET"])
@require_auth
def my_leaderboards():
    boards = leaderboards.find({"member_ids": g.user_id})
    return jsonify([serialize(b) for b in boards])

# ── Achievements ─────────────────────────────────────────────────────────────

@app.route("/api/achievements/check", methods=["POST"])
@require_auth
def check_achievements():
    newly_granted = check_and_grant_achievements(g.user_id)
    return jsonify({"newly_granted": newly_granted})

# ── Market submission (student) ───────────────────────────────────────────────

@app.route("/api/markets/submit", methods=["POST"])
@require_auth
def submit_market():
    data = request.json or {}
    required = ("question", "category", "closes_at")
    for f in required:
        if f not in data:
            return jsonify({"error": f"Missing field: {f}"}), 400
    market = submit_market_for_review(
        question=data["question"],
        category=data["category"],
        icon=data.get("icon", "📊"),
        question_type=data.get("question_type", "yes_no"),
        yes_price=int(data.get("yes_price", 50)),
        closes_at=data["closes_at"],
        created_by=g.user_id,
    )
    return jsonify(market), 201

# ── Admin endpoints ───────────────────────────────────────────────────────────

@app.route("/api/admin/markets/pending", methods=["GET"])
@require_admin
def admin_pending_markets():
    return jsonify(get_pending_markets())

@app.route("/api/admin/markets/<market_id>/approve", methods=["POST"])
@require_admin
def admin_approve(market_id):
    market, err = approve_market(market_id)
    if err:
        return jsonify({"error": err}), 404
    return jsonify(market)

@app.route("/api/admin/markets/<market_id>/reject", methods=["POST"])
@require_admin
def admin_reject(market_id):
    data = request.json or {}
    result, err = reject_market(market_id, reason=data.get("reason", ""))
    if err:
        return jsonify({"error": err}), 404
    return jsonify(result)

@app.route("/api/admin/markets", methods=["POST"])
@require_admin
def admin_create_market():
    """Admin creates a market directly — bypasses review, goes straight to open."""
    data = request.json or {}
    required = ("question", "category", "yes_price", "closes_at")
    for f in required:
        if f not in data:
            return jsonify({"error": f"Missing field: {f}"}), 400
    yes_price = int(data["yes_price"])
    market = create_market(
        question=data["question"],
        category=data["category"],
        icon=data.get("icon", "📊"),
        yes_price=yes_price,
        no_price=100 - yes_price,
        closes_at=data["closes_at"],
        created_by=g.user_id,
    )
    return jsonify(market), 201

# ── Daily bonus ──────────────────────────────────────────────────────────────

@app.route("/api/daily-bonus", methods=["POST"])
@require_auth
def daily_bonus():
    result, err = claim_daily_bonus(g.user_id)
    if err:
        return jsonify({"error": err}), 400
    return jsonify(result)

# ── Push subscriptions ────────────────────────────────────────────────────────

@app.route("/api/push/subscribe", methods=["POST"])
@require_auth
def push_subscribe():
    data = request.json or {}
    if not data.get("endpoint"):
        return jsonify({"error": "Invalid subscription"}), 400
    save_push_subscription(g.user_id, data)
    return jsonify({"subscribed": True})

@app.route("/api/push/vapid-public-key", methods=["GET"])
def vapid_public_key():
    import os
    return jsonify({"key": os.environ.get("VAPID_PUBLIC_KEY", "")})

# ── Social ────────────────────────────────────────────────────────────────────

@app.route("/api/users/<target_id>/follow", methods=["POST"])
@require_auth
def do_follow(target_id):
    result, err = follow_user(g.user_id, target_id)
    if err:
        return jsonify({"error": err}), 400
    return jsonify(result)

@app.route("/api/users/<target_id>/follow", methods=["DELETE"])
@require_auth
def do_unfollow(target_id):
    result, _ = unfollow_user(g.user_id, target_id)
    return jsonify(result)

@app.route("/api/users/<target_id>/follow-status", methods=["GET"])
@require_auth
def follow_status(target_id):
    return jsonify({"following": get_follow_status(g.user_id, target_id)})

@app.route("/api/social/feed", methods=["GET"])
@require_auth
def social_feed():
    limit = int(request.args.get("limit", 30))
    return jsonify(get_social_feed(g.user_id, limit))

# ── Admin analytics ───────────────────────────────────────────────────────────

@app.route("/api/admin/analytics", methods=["GET"])
@require_admin
def admin_analytics():
    return jsonify(get_admin_analytics())

# Also fire push notifications when admin resolves a market
@app.route("/api/admin/markets/<market_id>/resolve", methods=["POST"])
@require_admin
def admin_resolve_with_push(market_id):
    data = request.json or {}
    outcome = data.get("outcome")
    result, err = resolve_market(market_id, outcome)
    if err:
        return jsonify({"error": err}), 400
    # Fire push notifications in background (non-blocking best-effort)
    try:
        notify_bet_winners(market_id, outcome)
    except Exception:
        pass
    return jsonify(result)

# ── Run ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(debug=True, port=5000)
