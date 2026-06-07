from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
import base64
import re
from datetime import datetime, timedelta, timezone


def get_service(credentials: Credentials):
    return build("gmail", "v1", credentials=credentials)


def fetch_recent_messages(credentials: Credentials, days: int = 14) -> list[dict]:
    service = get_service(credentials)
    after_ts = int((datetime.now(timezone.utc) - timedelta(days=days)).timestamp())

    # Okunmamış veya starred, otomatik/spam hariç
    query = (
        f"after:{after_ts} "
        "-category:promotions -category:social -category:updates "
        "is:unread OR is:starred"
    )

    result = service.users().messages().list(
        userId="me", q=query, maxResults=50
    ).execute()

    messages = result.get("messages", [])
    parsed = []

    for msg_ref in messages:
        msg = service.users().messages().get(
            userId="me", id=msg_ref["id"], format="full"
        ).execute()
        parsed.append(_parse_message(msg))

    return parsed


def _parse_message(msg: dict) -> dict:
    headers = {h["name"]: h["value"] for h in msg["payload"].get("headers", [])}
    body = _extract_body(msg["payload"])

    return {
        "id": msg["id"],
        "subject": headers.get("Subject", "(Konu yok)"),
        "from": headers.get("From", ""),
        "date": headers.get("Date", ""),
        "snippet": msg.get("snippet", ""),
        "body": body[:2000],  # token limitini aşmamak için kırp
        "labels": msg.get("labelIds", []),
    }


def _extract_body(payload: dict) -> str:
    mime = payload.get("mimeType", "")

    if mime == "text/plain":
        data = payload.get("body", {}).get("data", "")
        return base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="ignore")

    if mime.startswith("multipart/"):
        for part in payload.get("parts", []):
            text = _extract_body(part)
            if text:
                return text

    return ""
