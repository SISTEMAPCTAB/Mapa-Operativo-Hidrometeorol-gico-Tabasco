#!/usr/bin/env python3
"""Consulta aislada del canal CAP registrado para CONAGUA-SMN (OMM).

No modifica las fuentes hidrometeorológicas. Ante un error, publica cero avisos
y un estado explícito: nunca reutiliza avisos caducados como vigentes.
"""
import datetime as dt
import json
import os
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

FEED = "https://correo1.conagua.gob.mx/feedsmn/feedalert.aspx"
DEST = Path("data/cap-smn/latest.json")
CAP = "urn:oasis:names:tc:emergency:cap:1.2"
CAP11 = "urn:oasis:names:tc:emergency:cap:1.1"
REGION = (14.0, -95.5, 19.5, -89.0)  # referencia territorial, no cuenca oficial
MAX_BYTES = 2_000_000

def child(elem, tag):
    return next((c for c in elem if c.tag.split("}")[-1] == tag), None)

def value(elem, tag):
    c = child(elem, tag) if elem is not None else None
    return (c.text or "").strip() if c is not None else ""

def timestamp(v):
    if not v:
        return None
    try:
        d = dt.datetime.fromisoformat(v.replace("Z", "+00:00"))
        if not d.tzinfo:
            return None
        return d.astimezone(dt.timezone.utc)
    except ValueError:
        return None

def safe_fetch(url):
    p = urllib.parse.urlparse(url)
    if p.scheme != "https" or p.hostname not in {"correo1.conagua.gob.mx", "smn.conagua.gob.mx"}:
        raise ValueError("Host de aviso no autorizado")
    req = urllib.request.Request(url, headers={"User-Agent": "MapaHidrometeorologico/1.0 CAP-verificacion", "Accept": "application/xml, text/xml, application/rss+xml, application/atom+xml"})
    with urllib.request.urlopen(req, timeout=20) as res:
        raw = res.read(MAX_BYTES + 1)
        if len(raw) > MAX_BYTES:
            raise ValueError("Respuesta CAP excesiva")
        return ET.fromstring(raw)

def polygon(text):
    out = []
    for point in text.replace("\n", " ").split():
        try:
            lat, lon = [float(v) for v in point.split(",")]
        except (ValueError, TypeError):
            return []
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            return []
        out.append([lat, lon])
    if len(out) < 3:
        return []
    if out[0] != out[-1]:
        out.append(out[0])
    lat0, lon0, lat1, lon1 = REGION
    if max(p[0] for p in out) < lat0 or min(p[0] for p in out) > lat1:
        return []
    if max(p[1] for p in out) < lon0 or min(p[1] for p in out) > lon1:
        return []
    return out

def parse_cap(root, now):
    if root.tag.split("}")[-1] != "alert":
        return None
    if value(root, "status").lower() != "actual":
        return None
    if value(root, "scope").lower() != "public":
        return None
    if value(root, "msgType").lower() in ("cancel", "ack", "error"):
        return None
    sent = timestamp(value(root, "sent"))
    if not sent or sent > now + dt.timedelta(minutes=10):
        return None
    infos = [c for c in root if c.tag.split("}")[-1] == "info"]
    entries = []
    for info in infos:
        onset = timestamp(value(info, "onset")) or timestamp(value(info, "effective")) or sent
        expires = timestamp(value(info, "expires"))
        # Sin expiración documentada no se declara una alerta vigente.
        if not expires or not onset <= now < expires:
            continue
        areas = [c for c in info if c.tag.split("}")[-1] == "area"]
        for area in areas:
            shapes = [polygon((p.text or "").strip()) for p in area if p.tag.split("}")[-1] == "polygon"]
            shapes = [p for p in shapes if p]
            if not shapes:
                continue
            entries.append({
                "id": value(root, "identifier")[:160],
                "sender": value(root, "sender")[:180],
                "sent": sent.isoformat(),
                "expires": expires.isoformat(),
                "event": value(info, "event")[:200],
                "headline": value(info, "headline")[:400],
                "description": value(info, "description")[:1600],
                "instruction": value(info, "instruction")[:1000],
                "severity": value(info, "severity")[:50],
                "area": value(area, "areaDesc")[:350],
                "polygons": shapes,
            })
    return entries

def collect(root, now):
    if root.tag.split("}")[-1] == "alert":
        return parse_cap(root, now) or []
    links = []
    for el in root.iter():
        if el.tag.split("}")[-1] == "link":
            url = (el.get("href") or (el.text or "")).strip()
            if url and "feedalert.aspx" not in url:
                links.append(urllib.parse.urljoin(FEED, url))
    found = []
    for url in list(dict.fromkeys(links))[:35]:
        try:
            found.extend(parse_cap(safe_fetch(url), now) or [])
        except Exception as exc:
            print("No se pudo procesar enlace de aviso:", type(exc).__name__)
    return found

def main():
    now = dt.datetime.now(dt.timezone.utc)
    out = {"source": "CONAGUA-SMN CAP", "feed": FEED,
           "checked_utc": now.isoformat(), "state": "unavailable", "alerts": [],
           "note": "No se presenta ningún aviso hasta validar origen, vigencia y polígono oficiales."}
    try:
        root = safe_fetch(FEED)
        alerts = collect(root, now)
        # El alimentador puede devolver RSS sin enlaces CAP: no inferir que no hay alertas.
        recognizable = root.tag.split("}")[-1] in ("alert", "rss", "feed", "RDF")
        if not recognizable:
            raise ValueError("Respuesta no reconocida como CAP/Atom/RSS")
        out["alerts"] = alerts
        out["state"] = "ok" if root.tag.split("}")[-1] == "alert" or alerts else "no_verified_alerts"
        out["note"] = ("Avisos vigentes con polígonos verificables." if alerts else
                       "No se encontraron avisos vigentes con geometría verificable en el ámbito de referencia; no equivale a ausencia de peligro.")
    except Exception as exc:
        out["error"] = type(exc).__name__ + ": " + str(exc)[:240]
        print("CAP no disponible:", out["error"])
    DEST.parent.mkdir(parents=True, exist_ok=True)
    DEST.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Estado:", out["state"], "avisos:", len(out["alerts"]))

if __name__ == "__main__":
    main()
