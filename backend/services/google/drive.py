from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials


def get_service(credentials: Credentials):
    return build("drive", "v3", credentials=credentials)


def list_recent_files(
    credentials: Credentials,
    max_results: int = 20,
    mime_filter: str | None = None,
) -> list[dict]:
    """Son değiştirilen dosyaları listele."""
    service = get_service(credentials)
    query = "trashed = false"
    if mime_filter:
        query += f" and mimeType = '{mime_filter}'"

    result = service.files().list(
        q=query,
        pageSize=max_results,
        orderBy="modifiedTime desc",
        fields="files(id, name, mimeType, modifiedTime, webViewLink)",
    ).execute()
    return result.get("files", [])


def list_spreadsheets(credentials: Credentials, max_results: int = 20) -> list[dict]:
    """Sadece Google Sheets dosyalarını listele."""
    return list_recent_files(
        credentials,
        max_results=max_results,
        mime_filter="application/vnd.google-apps.spreadsheet",
    )


def read_doc_content(credentials: Credentials, file_id: str) -> str:
    """Google Doc içeriğini düz metin olarak oku."""
    service = get_service(credentials)
    content = service.files().export(fileId=file_id, mimeType="text/plain").execute()
    if isinstance(content, bytes):
        return content.decode("utf-8", errors="replace")
    return str(content)


def search_files(
    credentials: Credentials,
    query_term: str,
    max_results: int = 10,
) -> list[dict]:
    """İsme göre Drive dosyası ara."""
    service = get_service(credentials)
    result = service.files().list(
        q=f"name contains '{query_term}' and trashed = false",
        pageSize=max_results,
        fields="files(id, name, mimeType, modifiedTime, webViewLink)",
    ).execute()
    return result.get("files", [])
