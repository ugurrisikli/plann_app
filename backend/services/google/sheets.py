from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials


def get_service(credentials: Credentials):
    return build("sheets", "v4", credentials=credentials)


def fetch_all_content(credentials: Credentials, spreadsheet_id: str) -> str:
    """
    Tüm sheet sekmelerini düz metin olarak döner.
    AI bu metni okuyarak görevleri çıkaracak — format bağımsız çalışır.
    """
    service = get_service(credentials)

    # Önce sekme listesini al
    meta = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
    sheets = meta.get("sheets", [])

    all_text = []
    for sheet in sheets:
        title = sheet["properties"]["title"]
        result = service.spreadsheets().values().get(
            spreadsheetId=spreadsheet_id,
            range=title,
        ).execute()
        rows = result.get("values", [])
        if not rows:
            continue

        all_text.append(f"=== {title} ===")
        for row in rows:
            all_text.append("\t".join(str(cell) for cell in row))

    return "\n".join(all_text)


def list_spreadsheets_in_drive(credentials: Credentials) -> list[dict]:
    """Drive'daki spreadsheet'leri listeler — kullanıcı doğru dosyayı seçsin diye."""
    drive_service = build("drive", "v3", credentials=credentials)
    result = drive_service.files().list(
        q="mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
        fields="files(id, name, modifiedTime)",
        orderBy="modifiedTime desc",
        pageSize=20,
    ).execute()
    return result.get("files", [])
