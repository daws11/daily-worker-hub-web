#!/usr/bin/env python3
"""Seed staging database via Supabase REST API."""
import json, sys, requests

SRK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxbmxycXV0bmh4cWJ6ZmNtdnBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDEzMTQ1NCwiZXhwIjoyMDg5NzA3NDU0fQ.2xiz11ZhyhebQCcdPadrkpysWsSzpDlJSn8YrvEK0PA"
URL = "https://tqnlrqutnhxqbzfcmvpc.supabase.co/rest/v1"
HEADERS = {"Authorization": f"Bearer {SRK}", "apikey": SRK, "Content-Type": "application/json"}

def truncate(table):
    r = requests.delete(f"{URL}/{table}?id=not.is.null", headers=HEADERS)
    print(f"  {table} → {r.status_code}")

def insert(table, data):
    r = requests.post(f"{URL}/{table}", headers={**HEADERS, "Prefer": "return=minimal"}, json=data)
    if r.status_code not in (200, 201):
        print(f"  {table} → {r.status_code} ERROR: {r.text[:200]}")
    else:
        print(f"  {table} → {r.status_code} ({len(data)} rows)")

TRUNCATE_ORDER = [
    "reviews","messages","notifications","reports","disputes","webhooks",
    "wallet_transactions","payment_transactions","payout_requests","withdrawal_requests",
    "worker_transactions","worker_wallets","wallets",
    "bookings","transactions",
    "jobs_skills","job_applications","job_posts","jobs",
    "worker_skills","worker_badges","worker_badge_summary","worker_achievements","worker_availabilities","badges",
    "business_social_connections",
    "skills","categories",
    "businesses","workers",
    "kyc_verifications","bank_accounts","notification_preferences","user_fcm_tokens",
    "saved_searches","interview_sessions",
    "compliance_tracking","compliance_warnings","compliance_audit_log",
    "cancellation_reasons","admin_audit_logs","admin_users",
    "applications","conversations","social_platforms","users"
]

# ====== DATA ======

CATEGORIES = [
    {"id":"a1b2c3d4-0001-4000-8000-000000000001","name":"Housekeeping","slug":"housekeeping"},
    {"id":"a1b2c3d4-0001-4000-8000-000000000002","name":"F&B Service","slug":"fb-service"},
    {"id":"a1b2c3d4-0001-4000-8000-000000000003","name":"Front Desk","slug":"front-desk"},
    {"id":"a1b2c3d4-0001-4000-8000-000000000004","name":"Kitchen / Cook","slug":"kitchen-cook"},
    {"id":"a1b2c3d4-0001-4000-8000-000000000005","name":"Bartender","slug":"bartender"},
    {"id":"a1b2c3d4-0001-4000-8000-000000000006","name":"Gardener","slug":"gardener"},
    {"id":"a1b2c3d4-0001-4000-8000-000000000007","name":"Pool Maintenance","slug":"pool-maintenance"},
    {"id":"a1b2c3d4-0001-4000-8000-000000000008","name":"Security","slug":"security"},
    {"id":"a1b2c3d4-0001-4000-8000-000000000009","name":"Spa Therapist","slug":"spa-therapist"},
    {"id":"a1b2c3d4-0001-4000-8000-000000000010","name":"Event Staff","slug":"event-staff"},
    {"id":"a1b2c3d4-0001-4000-8000-000000000011","name":"Laundry","slug":"laundry"},
    {"id":"a1b2c3d4-0001-4000-8000-000000000012","name":"Maintenance","slug":"maintenance"},
    {"id":"a1b2c3d4-0001-4000-8000-000000000013","name":"Tour Guide","slug":"tour-guide"},
    {"id":"a1b2c3d4-0001-4000-8000-000000000014","name":"Waitstaff","slug":"waitstaff"},
]

SKILLS = [
    {"id":"b1b2c3d4-0001-4000-8000-000000000001","name":"Room Cleaning","slug":"room-cleaning"},
    {"id":"b1b2c3d4-0001-4000-8000-000000000002","name":"Laundry Management","slug":"laundry-management"},
    {"id":"b1b2c3d4-0001-4000-8000-000000000003","name":"Linen Change","slug":"linen-change"},
    {"id":"b1b2c3d4-0001-4000-8000-000000000004","name":"Deep Cleaning","slug":"deep-cleaning"},
    {"id":"b1b2c3d4-0001-4000-8000-000000000005","name":"Food Serving","slug":"food-serving"},
    {"id":"b1b2c3d4-0001-4000-8000-000000000006","name":"Table Setting","slug":"table-setting"},
    {"id":"b1b2c3d4-0001-4000-8000-000000000007","name":"Menu Knowledge","slug":"menu-knowledge"},
    {"id":"b1b2c3d4-0001-4000-8000-000000000008","name":"Guest Check-in","slug":"guest-check-in"},
    {"id":"b1b2c3d4-0001-4000-8000-000000000009","name":"Reservation Management","slug":"reservation-mgmt"},
    {"id":"b1b2c3d4-0001-4000-8000-000000000010","name":"Concierge Service","slug":"concierge-service"},
    {"id":"b1b2c3d4-0001-4000-8000-000000000011","name":"Food Preparation","slug":"food-preparation"},
    {"id":"b1b2c3d4-0001-4000-8000-000000000012","name":"Grill & BBQ","slug":"grill-bbq"},
    {"id":"b1b2c3d4-0001-4000-8000-000000000013","name":"Pastry & Baking","slug":"pastry-baking"},
    {"id":"b1b2c3d4-0001-4000-8000-000000000014","name":"Cocktail Mixing","slug":"cocktail-mixing"},
    {"id":"b1b2c3d4-0001-4000-8000-000000000015","name":"Wine Knowledge","slug":"wine-knowledge"},
    {"id":"b1b2c3d4-0001-4000-8000-000000000016","name":"Landscape Design","slug":"landscape-design"},
    {"id":"b1b2c3d4-0001-4000-8000-000000000017","name":"Plant Care","slug":"plant-care"},
    {"id":"b1b2c3d4-0001-4000-8000-000000000018","name":"Water Chemistry","slug":"water-chemistry"},
    {"id":"b1b2c3d4-0001-4000-8000-000000000019","name":"Pool Cleaning","slug":"pool-cleaning"},
    {"id":"b1b2c3d4-0001-4000-8000-000000000020","name":"Patrol & Surveillance","slug":"patrol-surveillance"},
    {"id":"b1b2c3d4-0001-4000-8000-000000000021","name":"Access Control","slug":"access-control"},
    {"id":"b1b2c3d4-0001-4000-8000-000000000022","name":"Massage Therapy","slug":"massage-therapy"},
    {"id":"b1b2c3d4-0001-4000-8000-000000000023","name":"Facial Treatment","slug":"facial-treatment"},
    {"id":"b1b2c3d4-0001-4000-8000-000000000024","name":"Event Setup","slug":"event-setup"},
    {"id":"b1b2c3d4-0001-4000-8000-000000000025","name":"AV Equipment","slug":"av-equipment"},
    {"id":"b1b2c3d4-0001-4000-8000-000000000026","name":"Plumbing","slug":"plumbing"},
    {"id":"b1b2c3d4-0001-4000-8000-000000000027","name":"Electrical Work","slug":"electrical-work"},
    {"id":"b1b2c3d4-0001-4000-8000-000000000028","name":"AC Maintenance","slug":"ac-maintenance"},
    {"id":"b1b2c3d4-0001-4000-8000-000000000029","name":"English Speaking","slug":"english-speaking"},
    {"id":"b1b2c3d4-0001-4000-8000-000000000030","name":"Local Knowledge","slug":"local-knowledge"},
]

USERS = [
    {"id":"c1b2c3d4-0001-4000-8000-000000000001","email":"business@test.com","full_name":"Made Wijaya","role":"business","phone":"+6281234567890"},
    {"id":"c1b2c3d4-0001-4000-8000-000000000002","email":"business2@test.com","full_name":"Nyoman Sari","role":"business","phone":"+6281234567891"},
    {"id":"c1b2c3d4-0001-4000-8000-000000000003","email":"business3@test.com","full_name":"Ketut Ardana","role":"business","phone":"+6281234567892"},
    {"id":"c1b2c3d4-0001-4000-8000-000000000004","email":"business4@test.com","full_name":"Wayan Sukerta","role":"business","phone":"+6281234567893"},
    {"id":"c1b2c3d4-0001-4000-8000-000000000005","email":"business5@test.com","full_name":"Putu Mahendra","role":"business","phone":"+6281234567894"},
    {"id":"c1b2c3d4-0001-4000-8000-000000000021","email":"admin@test.com","full_name":"Admin DWH","role":"business","phone":"+6281111111111"},
    {"id":"c1b2c3d4-0001-4000-8000-000000000010","email":"worker@test.com","full_name":"Wayan Kerta","role":"worker","phone":"+6282111111111"},
    {"id":"c1b2c3d4-0001-4000-8000-000000000011","email":"worker2@test.com","full_name":"Made Surya","role":"worker","phone":"+6282111111112"},
    {"id":"c1b2c3d4-0001-4000-8000-000000000012","email":"worker3@test.com","full_name":"Komang Adi","role":"worker","phone":"+6282111111113"},
    {"id":"c1b2c3d4-0001-4000-8000-000000000013","email":"worker4@test.com","full_name":"Ketut Rai","role":"worker","phone":"+6282111111114"},
    {"id":"c1b2c3d4-0001-4000-8000-000000000014","email":"worker5@test.com","full_name":"Gede Wibawa","role":"worker","phone":"+6282111111115"},
    {"id":"c1b2c3d4-0001-4000-8000-000000000015","email":"worker6@test.com","full_name":"Nyoman Putra","role":"worker","phone":"+6282111111116"},
    {"id":"c1b2c3d4-0001-4000-8000-000000000016","email":"worker7@test.com","full_name":"Wayan Sudarma","role":"worker","phone":"+6282111111117"},
    {"id":"c1b2c3d4-0001-4000-8000-000000000017","email":"worker8@test.com","full_name":"Made Suarjana","role":"worker","phone":"+6282111111118"},
    {"id":"c1b2c3d4-0001-4000-8000-000000000018","email":"worker9@test.com","full_name":"Putu Eka","role":"worker","phone":"+6282111111119"},
    {"id":"c1b2c3d4-0001-4000-8000-000000000019","email":"worker10@test.com","full_name":"Komang Dwi","role":"worker","phone":"+6282111111120"},
    {"id":"c1b2c3d4-0001-4000-8000-000000000020","email":"worker11@test.com","full_name":"Ketut Arya","role":"worker","phone":"+6282111111121"},
]

BUSINESSES = [
    {"id":"d1b2c3d4-0001-4000-8000-000000000001","user_id":"c1b2c3d4-0001-4000-8000-000000000001","name":"The Mulia Bali","description":"Luxury resort in Nusa Dua with pristine beaches and world-class service. 5-star property with 526 rooms.","phone":"+623617017777","email":"hr@themuliabali.com","website":"https://www.themuliabali.com","is_verified":True,"address":"Kawasan Pariwisata, Nusa Dua, Bali 80363","lat":-8.8011,"lng":115.2373},
    {"id":"d1b2c3d4-0001-4000-8000-000000000002","user_id":"c1b2c3d4-0001-4000-8000-000000000002","name":"AYANA Resort Bali","description":"Award-winning resort perched on cliffs above the Indian Ocean in Jimbaran. Features 12 restaurants and bars.","phone":"+62361702222","email":"hr@ayanaresort.com","website":"https://www.ayanaresort.com","is_verified":True,"address":"Jl. Karang Mas Sejahtera, Jimbaran, Bali 80364","lat":-8.8253,"lng":115.1616},
    {"id":"d1b2c3d4-0001-4000-8000-000000000003","user_id":"c1b2c3d4-0001-4000-8000-000000000003","name":"Potato Head Beach Club","description":"Iconic beach club and hotel in Seminyak. Known for contemporary art, music, and sustainable design.","phone":"+623614737979","email":"hr@potatohead.co","website":"https://www.potatohead.co","is_verified":True,"address":"Jl. Petitenget No.51B, Seminyak, Bali 80361","lat":-8.6922,"lng":115.1497},
    {"id":"d1b2c3d4-0001-4000-8000-000000000004","user_id":"c1b2c3d4-0001-4000-8000-000000000004","name":"Swept Away Resort","description":"Boutique resort in Ubud surrounded by rice terraces. Perfect for wellness retreats and intimate events.","phone":"+62361972338","email":"hr@sweptawayresort.com","website":"https://www.sweptawayresort.com","is_verified":True,"address":"Jl. Raya Sayan, Ubud, Bali 80571","lat":-8.5069,"lng":115.2456},
    {"id":"d1b2c3d4-0001-4000-8000-000000000005","user_id":"c1b2c3d4-0001-4000-8000-000000000005","name":"Motel Mexicola","description":"Vibrant Mexican-themed restaurant and bar in Seminyak. Popular for events and private dining.","phone":"+62361730899","email":"hr@motelmexicola.com","website":"https://www.motelmexicola.com","is_verified":False,"address":"Jl. Kayu Aya No.5, Seminyak, Bali 80361","lat":-8.6903,"lng":115.1524},
]

WORKERS = [
    {"id":"e1b2c3d4-0001-4000-8000-000000000010","user_id":"c1b2c3d4-0001-4000-8000-000000000010","full_name":"Wayan Kerta","bio":"Experienced housekeeper with 8 years at 5-star resorts.","phone":"+6282111111111","dob":"1990-03-15","address":"Jl. Sunset Road No.45, Seminyak","location_name":"Seminyak, Bali","lat":-8.691,"lng":115.153,"gender":"male","experience_years":8,"jobs_completed":42,"tier":"gold","rating":4.8,"reliability_score":92.5,"kyc_status":"verified","area":"Seminyak"},
    {"id":"e1b2c3d4-0001-4000-8000-000000000011","user_id":"c1b2c3d4-0001-4000-8000-000000000011","full_name":"Made Surya","bio":"New to the platform. Kitchen helper with 2 years experience.","phone":"+6282111111112","dob":"1998-07-22","address":"Jl. Teuku Umar No.12, Denpasar","location_name":"Denpasar, Bali","lat":-8.67,"lng":115.21,"gender":"male","experience_years":2,"jobs_completed":3,"tier":"classic","rating":3.5,"reliability_score":55.0,"kyc_status":"verified","area":"Denpasar"},
    {"id":"e1b2c3d4-0001-4000-8000-000000000012","user_id":"c1b2c3d4-0001-4000-8000-000000000012","full_name":"Komang Adi","bio":"Professional bartender with 5 years experience.","phone":"+6282111111113","dob":"1993-11-08","address":"Jl. Pantai Kuta No.88, Kuta","location_name":"Kuta, Bali","lat":-8.718,"lng":115.168,"gender":"male","experience_years":5,"jobs_completed":28,"tier":"silver","rating":4.5,"reliability_score":85.0,"kyc_status":"verified","area":"Kuta"},
    {"id":"e1b2c3d4-0001-4000-8000-000000000013","user_id":"c1b2c3d4-0001-4000-8000-000000000013","full_name":"Ketut Rai","bio":"Spa therapist certified in Balinese massage. 6 years experience.","phone":"+6282111111114","dob":"1992-01-30","address":"Jl. Raya Ubud No.35, Ubud","location_name":"Ubud, Bali","lat":-8.5069,"lng":115.2634,"gender":"female","experience_years":6,"jobs_completed":48,"tier":"gold","rating":4.9,"reliability_score":95.0,"kyc_status":"verified","area":"Ubud"},
    {"id":"e1b2c3d4-0001-4000-8000-000000000014","user_id":"c1b2c3d4-0001-4000-8000-000000000014","full_name":"Gede Wibawa","bio":"Front desk agent fluent in English and Japanese. 4 years experience.","phone":"+6282111111115","dob":"1995-05-14","address":"Jl. By Pass Ngurah Rai No.120, Sanur","location_name":"Sanur, Bali","lat":-8.708,"lng":115.262,"gender":"male","experience_years":4,"jobs_completed":20,"tier":"silver","rating":4.2,"reliability_score":78.0,"kyc_status":"verified","area":"Sanur"},
    {"id":"e1b2c3d4-0001-4000-8000-000000000015","user_id":"c1b2c3d4-0001-4000-8000-000000000015","full_name":"Nyoman Putra","bio":"Security guard with SIA certification. 7 years experience.","phone":"+6282111111116","dob":"1988-09-03","address":"Jl. Uluwatu No.55, Jimbaran","location_name":"Jimbaran, Bali","lat":-8.796,"lng":115.171,"gender":"male","experience_years":7,"jobs_completed":35,"tier":"silver","rating":4.3,"reliability_score":82.0,"kyc_status":"verified","area":"Jimbaran"},
    {"id":"e1b2c3d4-0001-4000-8000-000000000016","user_id":"c1b2c3d4-0001-4000-8000-000000000016","full_name":"Wayan Sudarma","bio":"Gardener specializing in tropical gardens. 10 years experience.","phone":"+6282111111117","dob":"1985-12-20","address":"Jl. Raya Canggu No.78, Canggu","location_name":"Canggu, Bali","lat":-8.649,"lng":115.138,"gender":"male","experience_years":10,"jobs_completed":27,"tier":"gold","rating":4.6,"reliability_score":88.0,"kyc_status":"verified","area":"Canggu"},
    {"id":"e1b2c3d4-0001-4000-8000-000000000017","user_id":"c1b2c3d4-0001-4000-8000-000000000017","full_name":"Made Suarjana","bio":"Event staff and AV technician. Experienced in weddings and corporate events.","phone":"+6282111111118","dob":"1994-06-11","address":"Jl. Pantai Berawa No.22, Canggu","location_name":"Canggu, Bali","lat":-8.654,"lng":115.145,"gender":"male","experience_years":3,"jobs_completed":15,"tier":"classic","rating":4.0,"reliability_score":70.0,"kyc_status":"verified","area":"Canggu"},
    {"id":"e1b2c3d4-0001-4000-8000-000000000018","user_id":"c1b2c3d4-0001-4000-8000-000000000018","full_name":"Putu Eka","bio":"Pool maintenance technician. Certified in water chemistry. 5 years experience.","phone":"+6282111111119","dob":"1991-04-25","address":"Jl. Nusa Dua Selatan No.15, Nusa Dua","location_name":"Nusa Dua, Bali","lat":-8.806,"lng":115.24,"gender":"male","experience_years":5,"jobs_completed":23,"tier":"silver","rating":4.4,"reliability_score":83.0,"kyc_status":"verified","area":"Nusa Dua"},
    {"id":"e1b2c3d4-0001-4000-8000-000000000019","user_id":"c1b2c3d4-0001-4000-8000-000000000019","full_name":"Komang Dwi","bio":"Waitstaff and F&B service. Fine dining trained. 3 years experience.","phone":"+6282111111120","dob":"1996-08-17","address":"Jl. Seminyak Square No.8, Seminyak","location_name":"Seminyak, Bali","lat":-8.688,"lng":115.155,"gender":"female","experience_years":3,"jobs_completed":30,"tier":"silver","rating":4.5,"reliability_score":86.0,"kyc_status":"verified","area":"Seminyak"},
    {"id":"e1b2c3d4-0001-4000-8000-000000000020","user_id":"c1b2c3d4-0001-4000-8000-000000000020","full_name":"Ketut Arya","bio":"Tour guide licensed by Bali Tourism Board. Cultural and adventure tours.","phone":"+6282111111121","dob":"1989-02-14","address":"Jl. Monkey Forest No.66, Ubud","location_name":"Ubud, Bali","lat":-8.5085,"lng":115.2585,"gender":"male","experience_years":8,"jobs_completed":38,"tier":"gold","rating":4.7,"reliability_score":90.0,"kyc_status":"verified","area":"Ubud"},
]

WORKER_SKILLS = [
    {"worker_id":"e1b2c3d4-0001-4000-8000-000000000010","skill_id":"b1b2c3d4-0001-4000-8000-000000000001"},
    {"worker_id":"e1b2c3d4-0001-4000-8000-000000000010","skill_id":"b1b2c3d4-0001-4000-8000-000000000002"},
    {"worker_id":"e1b2c3d4-0001-4000-8000-000000000010","skill_id":"b1b2c3d4-0001-4000-8000-000000000003"},
    {"worker_id":"e1b2c3d4-0001-4000-8000-000000000011","skill_id":"b1b2c3d4-0001-4000-8000-000000000011"},
    {"worker_id":"e1b2c3d4-0001-4000-8000-000000000011","skill_id":"b1b2c3d4-0001-4000-8000-000000000012"},
    {"worker_id":"e1b2c3d4-0001-4000-8000-000000000012","skill_id":"b1b2c3d4-0001-4000-8000-000000000014"},
    {"worker_id":"e1b2c3d4-0001-4000-8000-000000000012","skill_id":"b1b2c3d4-0001-4000-8000-000000000015"},
    {"worker_id":"e1b2c3d4-0001-4000-8000-000000000013","skill_id":"b1b2c3d4-0001-4000-8000-000000000022"},
    {"worker_id":"e1b2c3d4-0001-4000-8000-000000000013","skill_id":"b1b2c3d4-0001-4000-8000-000000000023"},
    {"worker_id":"e1b2c3d4-0001-4000-8000-000000000014","skill_id":"b1b2c3d4-0001-4000-8000-000000000008"},
    {"worker_id":"e1b2c3d4-0001-4000-8000-000000000014","skill_id":"b1b2c3d4-0001-4000-8000-000000000009"},
    {"worker_id":"e1b2c3d4-0001-4000-8000-000000000014","skill_id":"b1b2c3d4-0001-4000-8000-000000000029"},
    {"worker_id":"e1b2c3d4-0001-4000-8000-000000000015","skill_id":"b1b2c3d4-0001-4000-8000-000000000020"},
    {"worker_id":"e1b2c3d4-0001-4000-8000-000000000015","skill_id":"b1b2c3d4-0001-4000-8000-000000000021"},
    {"worker_id":"e1b2c3d4-0001-4000-8000-000000000016","skill_id":"b1b2c3d4-0001-4000-8000-000000000016"},
    {"worker_id":"e1b2c3d4-0001-4000-8000-000000000016","skill_id":"b1b2c3d4-0001-4000-8000-000000000017"},
    {"worker_id":"e1b2c3d4-0001-4000-8000-000000000017","skill_id":"b1b2c3d4-0001-4000-8000-000000000024"},
    {"worker_id":"e1b2c3d4-0001-4000-8000-000000000017","skill_id":"b1b2c3d4-0001-4000-8000-000000000025"},
    {"worker_id":"e1b2c3d4-0001-4000-8000-000000000018","skill_id":"b1b2c3d4-0001-4000-8000-000000000018"},
    {"worker_id":"e1b2c3d4-0001-4000-8000-000000000018","skill_id":"b1b2c3d4-0001-4000-8000-000000000019"},
    {"worker_id":"e1b2c3d4-0001-4000-8000-000000000019","skill_id":"b1b2c3d4-0001-4000-8000-000000000005"},
    {"worker_id":"e1b2c3d4-0001-4000-8000-000000000019","skill_id":"b1b2c3d4-0001-4000-8000-000000000006"},
    {"worker_id":"e1b2c3d4-0001-4000-8000-000000000019","skill_id":"b1b2c3d4-0001-4000-8000-000000000007"},
    {"worker_id":"e1b2c3d4-0001-4000-8000-000000000020","skill_id":"b1b2c3d4-0001-4000-8000-000000000029"},
    {"worker_id":"e1b2c3d4-0001-4000-8000-000000000020","skill_id":"b1b2c3d4-0001-4000-8000-000000000030"},
]

JOBS = [
    {"id":"f1b2c3d4-0001-4000-8000-000000000001","business_id":"d1b2c3d4-0001-4000-8000-000000000001","category_id":"a1b2c3d4-0001-4000-8000-000000000001","title":"Housekeeping - Villa Cleaning (3 Villas)","description":"Deep cleaning for 3 luxury pool villas.","requirements":"Experience with 5-star villa cleaning.","budget_min":350000,"budget_max":500000,"status":"open","deadline":"2026-04-07","address":"Kawasan Pariwisata, Nusa Dua","lat":-8.8011,"lng":115.2373,"is_urgent":True},
    {"id":"f1b2c3d4-0001-4000-8000-000000000002","business_id":"d1b2c3d4-0001-4000-8000-000000000001","category_id":"a1b2c3d4-0001-4000-8000-000000000001","title":"Housekeeping - Suite Room Turnover","description":"Standard turnover cleaning for 12 suite rooms.","requirements":"Housekeeping experience required.","budget_min":200000,"budget_max":300000,"status":"completed","deadline":"2026-04-03","address":"Kawasan Pariwisata, Nusa Dua","lat":-8.8011,"lng":115.2373},
    {"id":"f1b2c3d4-0001-4000-8000-000000000003","business_id":"d1b2c3d4-0001-4000-8000-000000000002","category_id":"a1b2c3d4-0001-4000-8000-000000000005","title":"Bartender - Beachside Bar","description":"Mix cocktails at cliff-edge beach bar. 80+ guests.","requirements":"3+ years bartending.","budget_min":300000,"budget_max":450000,"status":"open","deadline":"2026-04-06","address":"Jl. Karang Mas Sejahtera, Jimbaran","lat":-8.8253,"lng":115.1616},
    {"id":"f1b2c3d4-0001-4000-8000-000000000004","business_id":"d1b2c3d4-0001-4000-8000-000000000002","category_id":"a1b2c3d4-0001-4000-8000-000000000002","title":"F&B Waitstaff - Fine Dining","description":"Serve 5-course tasting menu for 40 guests.","requirements":"Fine dining experience. English fluency.","budget_min":250000,"budget_max":350000,"status":"completed","deadline":"2026-04-02","address":"Jl. Karang Mas Sejahtera, Jimbaran","lat":-8.8253,"lng":115.1616},
    {"id":"f1b2c3d4-0001-4000-8000-000000000005","business_id":"d1b2c3d4-0001-4000-8000-000000000003","category_id":"a1b2c3d4-0001-4000-8000-000000000010","title":"Event Staff - Beach Wedding Setup","description":"Setup beach wedding for 150 guests.","requirements":"Event setup experience.","budget_min":400000,"budget_max":600000,"status":"open","deadline":"2026-04-08","address":"Jl. Petitenget, Seminyak","lat":-8.6922,"lng":115.1497},
    {"id":"f1b2c3d4-0001-4000-8000-000000000006","business_id":"d1b2c3d4-0001-4000-8000-000000000003","category_id":"a1b2c3d4-0001-4000-8000-000000000002","title":"F&B Service - Sunday Brunch","description":"Buffet service for 200 guests.","requirements":"F&B service experience.","budget_min":200000,"budget_max":300000,"status":"in_progress","deadline":"2026-04-05","address":"Jl. Petitenget, Seminyak","lat":-8.6922,"lng":115.1497},
    {"id":"f1b2c3d4-0001-4000-8000-000000000007","business_id":"d1b2c3d4-0001-4000-8000-000000000004","category_id":"a1b2c3d4-0001-4000-8000-000000000009","title":"Spa Therapist - Balinese Massage","description":"Provide Balinese massage sessions. 4-6 sessions.","requirements":"Certified massage therapist.","budget_min":400000,"budget_max":600000,"status":"completed","deadline":"2026-04-01","address":"Jl. Raya Sayan, Ubud","lat":-8.5069,"lng":115.2456},
    {"id":"f1b2c3d4-0001-4000-8000-000000000008","business_id":"d1b2c3d4-0001-4000-8000-000000000004","category_id":"a1b2c3d4-0001-4000-8000-000000000006","title":"Gardener - Tropical Garden Maintenance","description":"Maintain resort tropical gardens.","requirements":"Gardening experience.","budget_min":175000,"budget_max":250000,"status":"open","deadline":"2026-04-06","address":"Jl. Raya Sayan, Ubud","lat":-8.5069,"lng":115.2456},
    {"id":"f1b2c3d4-0001-4000-8000-000000000009","business_id":"d1b2c3d4-0001-4000-8000-000000000005","category_id":"a1b2c3d4-0001-4000-8000-000000000004","title":"Kitchen Prep Cook - Taco Night","description":"Prep 200+ portions of ingredients.","requirements":"Kitchen experience.","budget_min":225000,"budget_max":325000,"status":"open","deadline":"2026-04-08","address":"Jl. Kayu Aya, Seminyak","lat":-8.6903,"lng":115.1524},
    {"id":"f1b2c3d4-0001-4000-8000-000000000010","business_id":"d1b2c3d4-0001-4000-8000-000000000005","category_id":"a1b2c3d4-0001-4000-8000-000000000005","title":"Bartender - Margarita Night","description":"Bartender for themed margarita night.","requirements":"Bartending experience.","budget_min":275000,"budget_max":400000,"status":"cancelled","deadline":"2026-04-03","address":"Jl. Kayu Aya, Seminyak","lat":-8.6903,"lng":115.1524},
    {"id":"f1b2c3d4-0001-4000-8000-000000000011","business_id":"d1b2c3d4-0001-4000-8000-000000000001","category_id":"a1b2c3d4-0001-4000-8000-000000000007","title":"Pool Maintenance - Infinity Pool","description":"Clean 3 infinity pools. Chemical balance check.","requirements":"Pool maintenance certification.","budget_min":300000,"budget_max":450000,"status":"open","deadline":"2026-04-07","address":"Kawasan Pariwisata, Nusa Dua","lat":-8.8011,"lng":115.2373},
    {"id":"f1b2c3d4-0001-4000-8000-000000000012","business_id":"d1b2c3d4-0001-4000-8000-000000000001","category_id":"a1b2c3d4-0001-4000-8000-000000000003","title":"Front Desk - Night Shift","description":"Night shift front desk. Check-in, phone handling.","requirements":"Front desk experience. English.","budget_min":250000,"budget_max":350000,"status":"in_progress","deadline":"2026-04-05","address":"Kawasan Pariwisata, Nusa Dua","lat":-8.8011,"lng":115.2373},
    {"id":"f1b2c3d4-0001-4000-8000-000000000013","business_id":"d1b2c3d4-0001-4000-8000-000000000002","category_id":"a1b2c3d4-0001-4000-8000-000000000008","title":"Security - Cliff Edge Patrol","description":"Patrol resort perimeter. Monitor CCTV.","requirements":"Security certification.","budget_min":225000,"budget_max":325000,"status":"completed","deadline":"2026-04-02","address":"Jl. Karang Mas Sejahtera, Jimbaran","lat":-8.8253,"lng":115.1616},
    {"id":"f1b2c3d4-0001-4000-8000-000000000014","business_id":"d1b2c3d4-0001-4000-8000-000000000004","category_id":"a1b2c3d4-0001-4000-8000-000000000013","title":"Tour Guide - Ubud Cultural Walk","description":"Lead 3-hour cultural walking tour.","requirements":"Licensed tour guide. English.","budget_min":350000,"budget_max":500000,"status":"completed","deadline":"2026-03-30","address":"Jl. Raya Sayan, Ubud","lat":-8.5069,"lng":115.2456},
    {"id":"f1b2c3d4-0001-4000-8000-000000000015","business_id":"d1b2c3d4-0001-4000-8000-000000000003","category_id":"a1b2c3d4-0001-4000-8000-000000000001","title":"Housekeeping - Deep Clean (20 Rooms)","description":"Deep cleaning of 20 rooms after group checkout.","requirements":"Housekeeping experience.","budget_min":275000,"budget_max":400000,"status":"open","deadline":"2026-04-06","address":"Jl. Petitenget, Seminyak","lat":-8.6922,"lng":115.1497,"is_urgent":True},
    {"id":"f1b2c3d4-0001-4000-8000-000000000016","business_id":"d1b2c3d4-0001-4000-8000-000000000002","category_id":"a1b2c3d4-0001-4000-8000-000000000004","title":"Kitchen - Banquet Prep (100 Pax)","description":"Prep cook for corporate banquet.","requirements":"Commercial kitchen experience.","budget_min":300000,"budget_max":450000,"status":"open","deadline":"2026-04-09","address":"Jl. Karang Mas Sejahtera, Jimbaran","lat":-8.8253,"lng":115.1616},
    {"id":"f1b2c3d4-0001-4000-8000-000000000017","business_id":"d1b2c3d4-0001-4000-8000-000000000001","category_id":"a1b2c3d4-0001-4000-8000-000000000002","title":"F&B Service - Pool Bar","description":"Serve drinks and light meals at pool bar.","requirements":"F&B experience.","budget_min":200000,"budget_max":300000,"status":"completed","deadline":"2026-04-01","address":"Kawasan Pariwisata, Nusa Dua","lat":-8.8011,"lng":115.2373},
    {"id":"f1b2c3d4-0001-4000-8000-000000000018","business_id":"d1b2c3d4-0001-4000-8000-000000000004","category_id":"a1b2c3d4-0001-4000-8000-000000000012","title":"Maintenance - AC Repair (8 Units)","description":"Repair 8 split AC units across resort villas.","requirements":"AC repair certification.","budget_min":400000,"budget_max":600000,"status":"open","deadline":"2026-04-07","address":"Jl. Raya Sayan, Ubud","lat":-8.5069,"lng":115.2456},
    {"id":"f1b2c3d4-0001-4000-8000-000000000019","business_id":"d1b2c3d4-0001-4000-8000-000000000005","category_id":"a1b2c3d4-0001-4000-8000-000000000010","title":"Event Staff - Private Party Setup","description":"Setup private birthday party. 40 guests.","requirements":"Event experience.","budget_min":350000,"budget_max":500000,"status":"in_progress","deadline":"2026-04-05","address":"Jl. Kayu Aya, Seminyak","lat":-8.6903,"lng":115.1524},
    {"id":"f1b2c3d4-0001-4000-8000-000000000020","business_id":"d1b2c3d4-0001-4000-8000-000000000001","category_id":"a1b2c3d4-0001-4000-8000-000000000009","title":"Spa Therapist - Couples Package","description":"Couples spa package. 3 couples scheduled.","requirements":"Certified therapist.","budget_min":500000,"budget_max":700000,"status":"open","deadline":"2026-04-06","address":"Kawasan Pariwisata, Nusa Dua","lat":-8.8011,"lng":115.2373},
    {"id":"f1b2c3d4-0001-4000-8000-000000000021","business_id":"d1b2c3d4-0001-4000-8000-000000000002","category_id":"a1b2c3d4-0001-4000-8000-000000000011","title":"Laundry - Hotel Linen Service","description":"Process bulk hotel laundry. 200+ sets.","requirements":"Laundry experience.","budget_min":175000,"budget_max":250000,"status":"completed","deadline":"2026-04-03","address":"Jl. Karang Mas Sejahtera, Jimbaran","lat":-8.8253,"lng":115.1616},
    {"id":"f1b2c3d4-0001-4000-8000-000000000022","business_id":"d1b2c3d4-0001-4000-8000-000000000003","category_id":"a1b2c3d4-0001-4000-8000-000000000014","title":"Waitstaff - Sunset Dinner Service","description":"Beachfront sunset dinner. 60 guests, 4-course menu.","requirements":"Waitstaff experience.","budget_min":250000,"budget_max":375000,"status":"open","deadline":"2026-04-06","address":"Jl. Petitenget, Seminyak","lat":-8.6922,"lng":115.1497},
]

JOBS_SKILLS = [
    {"job_id":"f1b2c3d4-0001-4000-8000-000000000001","skill_id":"b1b2c3d4-0001-4000-8000-000000000001"},
    {"job_id":"f1b2c3d4-0001-4000-8000-000000000001","skill_id":"b1b2c3d4-0001-4000-8000-000000000003"},
    {"job_id":"f1b2c3d4-0001-4000-8000-000000000003","skill_id":"b1b2c3d4-0001-4000-8000-000000000014"},
    {"job_id":"f1b2c3d4-0001-4000-8000-000000000003","skill_id":"b1b2c3d4-0001-4000-8000-000000000015"},
    {"job_id":"f1b2c3d4-0001-4000-8000-000000000004","skill_id":"b1b2c3d4-0001-4000-8000-000000000005"},
    {"job_id":"f1b2c3d4-0001-4000-8000-000000000004","skill_id":"b1b2c3d4-0001-4000-8000-000000000006"},
    {"job_id":"f1b2c3d4-0001-4000-8000-000000000007","skill_id":"b1b2c3d4-0001-4000-8000-000000000022"},
    {"job_id":"f1b2c3d4-0001-4000-8000-000000000008","skill_id":"b1b2c3d4-0001-4000-8000-000000000016"},
    {"job_id":"f1b2c3d4-0001-4000-8000-000000000008","skill_id":"b1b2c3d4-0001-4000-8000-000000000017"},
    {"job_id":"f1b2c3d4-0001-4000-8000-000000000009","skill_id":"b1b2c3d4-0001-4000-8000-000000000011"},
    {"job_id":"f1b2c3d4-0001-4000-8000-000000000011","skill_id":"b1b2c3d4-0001-4000-8000-000000000018"},
    {"job_id":"f1b2c3d4-0001-4000-8000-000000000011","skill_id":"b1b2c3d4-0001-4000-8000-000000000019"},
    {"job_id":"f1b2c3d4-0001-4000-8000-000000000012","skill_id":"b1b2c3d4-0001-4000-8000-000000000008"},
    {"job_id":"f1b2c3d4-0001-4000-8000-000000000014","skill_id":"b1b2c3d4-0001-4000-8000-000000000029"},
    {"job_id":"f1b2c3d4-0001-4000-8000-000000000014","skill_id":"b1b2c3d4-0001-4000-8000-000000000030"},
    {"job_id":"f1b2c3d4-0001-4000-8000-000000000022","skill_id":"b1b2c3d4-0001-4000-8000-000000000005"},
    {"job_id":"f1b2c3d4-0001-4000-8000-000000000022","skill_id":"b1b2c3d4-0001-4000-8000-000000000006"},
]

WALLETS = [
    {"id":"g1b2c3d4-0001-4000-8000-000000000001","user_id":"c1b2c3d4-0001-4000-8000-000000000001","business_id":"d1b2c3d4-0001-4000-8000-000000000001","balance":5000000,"pending_balance":550000,"available_balance":4450000,"currency":"IDR","is_active":True},
    {"id":"g1b2c3d4-0001-4000-8000-000000000002","user_id":"c1b2c3d4-0001-4000-8000-000000000002","business_id":"d1b2c3d4-0001-4000-8000-000000000002","balance":3500000,"pending_balance":0,"available_balance":3500000,"currency":"IDR","is_active":True},
    {"id":"g1b2c3d4-0001-4000-8000-000000000003","user_id":"c1b2c3d4-0001-4000-8000-000000000003","business_id":"d1b2c3d4-0001-4000-8000-000000000003","balance":2000000,"pending_balance":250000,"available_balance":1750000,"currency":"IDR","is_active":True},
    {"id":"g1b2c3d4-0001-4000-8000-000000000004","user_id":"c1b2c3d4-0001-4000-8000-000000000004","business_id":"d1b2c3d4-0001-4000-8000-000000000004","balance":1500000,"pending_balance":0,"available_balance":1500000,"currency":"IDR","is_active":True},
    {"id":"g1b2c3d4-0001-4000-8000-000000000005","user_id":"c1b2c3d4-0001-4000-8000-000000000005","business_id":"d1b2c3d4-0001-4000-8000-000000000005","balance":475000,"pending_balance":0,"available_balance":475000,"currency":"IDR","is_active":True},
    {"id":"g1b2c3d4-0001-4000-8000-000000000010","user_id":"c1b2c3d4-0001-4000-8000-000000000010","worker_id":"e1b2c3d4-0001-4000-8000-000000000010","balance":1850000,"pending_balance":250000,"available_balance":1600000,"currency":"IDR","is_active":True},
    {"id":"g1b2c3d4-0001-4000-8000-000000000011","user_id":"c1b2c3d4-0001-4000-8000-000000000011","worker_id":"e1b2c3d4-0001-4000-8000-000000000011","balance":200000,"pending_balance":0,"available_balance":200000,"currency":"IDR","is_active":True},
    {"id":"g1b2c3d4-0001-4000-8000-000000000012","user_id":"c1b2c3d4-0001-4000-8000-000000000012","worker_id":"e1b2c3d4-0001-4000-8000-000000000012","balance":1420000,"pending_balance":0,"available_balance":1420000,"currency":"IDR","is_active":True},
    {"id":"g1b2c3d4-0001-4000-8000-000000000013","user_id":"c1b2c3d4-0001-4000-8000-000000000013","worker_id":"e1b2c3d4-0001-4000-8000-000000000013","balance":2280000,"pending_balance":550000,"available_balance":1730000,"currency":"IDR","is_active":True},
    {"id":"g1b2c3d4-0001-4000-8000-000000000014","user_id":"c1b2c3d4-0001-4000-8000-000000000014","worker_id":"e1b2c3d4-0001-4000-8000-000000000014","balance":960000,"pending_balance":300000,"available_balance":660000,"currency":"IDR","is_active":True},
    {"id":"g1b2c3d4-0001-4000-8000-000000000015","user_id":"c1b2c3d4-0001-4000-8000-000000000015","worker_id":"e1b2c3d4-0001-4000-8000-000000000015","balance":1375000,"pending_balance":0,"available_balance":1375000,"currency":"IDR","is_active":True},
    {"id":"g1b2c3d4-0001-4000-8000-000000000016","user_id":"c1b2c3d4-0001-4000-8000-000000000016","worker_id":"e1b2c3d4-0001-4000-8000-000000000016","balance":780000,"pending_balance":0,"available_balance":780000,"currency":"IDR","is_active":True},
    {"id":"g1b2c3d4-0001-4000-8000-000000000017","user_id":"c1b2c3d4-0001-4000-8000-000000000017","worker_id":"e1b2c3d4-0001-4000-8000-000000000017","balance":550000,"pending_balance":0,"available_balance":550000,"currency":"IDR","is_active":True},
    {"id":"g1b2c3d4-0001-4000-8000-000000000018","user_id":"c1b2c3d4-0001-4000-8000-000000000018","worker_id":"e1b2c3d4-0001-4000-8000-000000000018","balance":670000,"pending_balance":0,"available_balance":670000,"currency":"IDR","is_active":True},
    {"id":"g1b2c3d4-0001-4000-8000-000000000019","user_id":"c1b2c3d4-0001-4000-8000-000000000019","worker_id":"e1b2c3d4-0001-4000-8000-000000000019","balance":800000,"pending_balance":0,"available_balance":800000,"currency":"IDR","is_active":True},
    {"id":"g1b2c3d4-0001-4000-8000-000000000020","user_id":"c1b2c3d4-0001-4000-8000-000000000020","worker_id":"e1b2c3d4-0001-4000-8000-000000000020","balance":1270000,"pending_balance":0,"available_balance":1270000,"currency":"IDR","is_active":True},
]

BOOKINGS = [
    {"id":"h1b2c3d4-0001-4000-8000-000000000001","job_id":"f1b2c3d4-0001-4000-8000-000000000002","worker_id":"e1b2c3d4-0001-4000-8000-000000000010","business_id":"d1b2c3d4-0001-4000-8000-000000000001","status":"completed","start_date":"2026-04-02","end_date":"2026-04-03","final_price":250000,"payment_status":"paid","created_at":"2026-04-01T10:00:00Z"},
    {"id":"h1b2c3d4-0001-4000-8000-000000000002","job_id":"f1b2c3d4-0001-4000-8000-000000000004","worker_id":"e1b2c3d4-0001-4000-8000-000000000019","business_id":"d1b2c3d4-0001-4000-8000-000000000002","status":"completed","start_date":"2026-04-01","end_date":"2026-04-02","final_price":300000,"payment_status":"paid","created_at":"2026-03-31T14:00:00Z"},
    {"id":"h1b2c3d4-0001-4000-8000-000000000003","job_id":"f1b2c3d4-0001-4000-8000-000000000007","worker_id":"e1b2c3d4-0001-4000-8000-000000000013","business_id":"d1b2c3d4-0001-4000-8000-000000000004","status":"completed","start_date":"2026-03-30","end_date":"2026-04-01","final_price":500000,"payment_status":"paid","created_at":"2026-03-29T09:00:00Z"},
    {"id":"h1b2c3d4-0001-4000-8000-000000000004","job_id":"f1b2c3d4-0001-4000-8000-000000000013","worker_id":"e1b2c3d4-0001-4000-8000-000000000015","business_id":"d1b2c3d4-0001-4000-8000-000000000002","status":"completed","start_date":"2026-04-01","end_date":"2026-04-02","final_price":275000,"payment_status":"paid","created_at":"2026-03-31T11:00:00Z"},
    {"id":"h1b2c3d4-0001-4000-8000-000000000005","job_id":"f1b2c3d4-0001-4000-8000-000000000014","worker_id":"e1b2c3d4-0001-4000-8000-000000000020","business_id":"d1b2c3d4-0001-4000-8000-000000000004","status":"completed","start_date":"2026-03-28","end_date":"2026-03-30","final_price":450000,"payment_status":"paid","created_at":"2026-03-27T08:00:00Z"},
    {"id":"h1b2c3d4-0001-4000-8000-000000000006","job_id":"f1b2c3d4-0001-4000-8000-000000000017","worker_id":"e1b2c3d4-0001-4000-8000-000000000019","business_id":"d1b2c3d4-0001-4000-8000-000000000001","status":"completed","start_date":"2026-03-30","end_date":"2026-04-01","final_price":250000,"payment_status":"paid","created_at":"2026-03-29T16:00:00Z"},
    {"id":"h1b2c3d4-0001-4000-8000-000000000007","job_id":"f1b2c3d4-0001-4000-8000-000000000021","worker_id":"e1b2c3d4-0001-4000-8000-000000000011","business_id":"d1b2c3d4-0001-4000-8000-000000000002","status":"completed","start_date":"2026-04-02","end_date":"2026-04-03","final_price":200000,"payment_status":"paid","created_at":"2026-04-01T07:00:00Z"},
    {"id":"h1b2c3d4-0001-4000-8000-000000000008","job_id":"f1b2c3d4-0001-4000-8000-000000000006","worker_id":"e1b2c3d4-0001-4000-8000-000000000019","business_id":"d1b2c3d4-0001-4000-8000-000000000003","status":"in_progress","start_date":"2026-04-05","end_date":"2026-04-05","final_price":250000,"payment_status":"pending","created_at":"2026-04-04T18:00:00Z"},
    {"id":"h1b2c3d4-0001-4000-8000-000000000009","job_id":"f1b2c3d4-0001-4000-8000-000000000012","worker_id":"e1b2c3d4-0001-4000-8000-000000000014","business_id":"d1b2c3d4-0001-4000-8000-000000000001","status":"in_progress","start_date":"2026-04-05","end_date":"2026-04-05","final_price":300000,"payment_status":"pending","created_at":"2026-04-04T20:00:00Z"},
    {"id":"h1b2c3d4-0001-4000-8000-000000000010","job_id":"f1b2c3d4-0001-4000-8000-000000000019","worker_id":"e1b2c3d4-0001-4000-8000-000000000017","business_id":"d1b2c3d4-0001-4000-8000-000000000005","status":"in_progress","start_date":"2026-04-05","end_date":"2026-04-05","final_price":400000,"payment_status":"pending","created_at":"2026-04-04T22:00:00Z"},
    {"id":"h1b2c3d4-0001-4000-8000-000000000011","job_id":"f1b2c3d4-0001-4000-8000-000000000010","worker_id":"e1b2c3d4-0001-4000-8000-000000000012","business_id":"d1b2c3d4-0001-4000-8000-000000000005","status":"cancelled","start_date":"2026-04-03","end_date":"2026-04-03","final_price":0,"payment_status":"refunded","created_at":"2026-04-02T15:00:00Z"},
    {"id":"h1b2c3d4-0001-4000-8000-000000000012","job_id":"f1b2c3d4-0001-4000-8000-000000000020","worker_id":"e1b2c3d4-0001-4000-8000-000000000013","business_id":"d1b2c3d4-0001-4000-8000-000000000001","status":"pending","start_date":"2026-04-06","end_date":"2026-04-06","final_price":550000,"payment_status":"pending","created_at":"2026-04-05T06:00:00Z"},
]

REVIEWS = [
    {"id":"k1b2c3d4-0001-4000-8000-000000000001","booking_id":"h1b2c3d4-0001-4000-8000-000000000001","worker_id":"e1b2c3d4-0001-4000-8000-000000000010","rating":5,"comment":"Wayan is exceptional! Villas spotless. Will request again.","created_at":"2026-04-03T15:00:00Z"},
    {"id":"k1b2c3d4-0001-4000-8000-000000000002","booking_id":"h1b2c3d4-0001-4000-8000-000000000002","worker_id":"e1b2c3d4-0001-4000-8000-000000000019","rating":4,"comment":"Good service. Professional and punctual.","created_at":"2026-04-02T22:30:00Z"},
    {"id":"k1b2c3d4-0001-4000-8000-000000000003","booking_id":"h1b2c3d4-0001-4000-8000-000000000003","worker_id":"e1b2c3d4-0001-4000-8000-000000000013","rating":5,"comment":"Best massage therapist! Highly recommended!","created_at":"2026-04-01T18:30:00Z"},
    {"id":"k1b2c3d4-0001-4000-8000-000000000004","booking_id":"h1b2c3d4-0001-4000-8000-000000000004","worker_id":"e1b2c3d4-0001-4000-8000-000000000015","rating":4,"comment":"Reliable security guard. Professional.","created_at":"2026-04-02T19:00:00Z"},
    {"id":"k1b2c3d4-0001-4000-8000-000000000005","booking_id":"h1b2c3d4-0001-4000-8000-000000000005","worker_id":"e1b2c3d4-0001-4000-8000-000000000020","rating":5,"comment":"Amazing tour guide! Cultural insights were great.","created_at":"2026-03-30T17:00:00Z"},
    {"id":"k1b2c3d4-0001-4000-8000-000000000006","booking_id":"h1b2c3d4-0001-4000-8000-000000000006","worker_id":"e1b2c3d4-0001-4000-8000-000000000019","rating":4,"comment":"Great pool bar service. Would hire again.","created_at":"2026-04-01T20:30:00Z"},
    {"id":"k1b2c3d4-0001-4000-8000-000000000007","booking_id":"h1b2c3d4-0001-4000-8000-000000000007","worker_id":"e1b2c3d4-0001-4000-8000-000000000011","rating":3,"comment":"Decent work but could be faster.","created_at":"2026-04-03T15:30:00Z"},
]

MESSAGES = [
    {"id":"l1b2c3d4-0001-4000-8000-000000000001","sender_id":"c1b2c3d4-0001-4000-8000-000000000001","receiver_id":"c1b2c3d4-0001-4000-8000-000000000010","booking_id":"h1b2c3d4-0001-4000-8000-000000000001","content":"Hi Wayan, villas di blok A nomor 3, 5, 7. Kunci di front desk.","is_read":True,"created_at":"2026-04-01T10:30:00Z"},
    {"id":"l1b2c3d4-0001-4000-8000-000000000002","sender_id":"c1b2c3d4-0001-4000-8000-000000000010","receiver_id":"c1b2c3d4-0001-4000-8000-000000000001","booking_id":"h1b2c3d4-0001-4000-8000-000000000001","content":"Baik Pak, sudah ambil kuncinya. Mulai kerja sekarang.","is_read":True,"created_at":"2026-04-01T10:45:00Z"},
    {"id":"l1b2c3d4-0001-4000-8000-000000000003","sender_id":"c1b2c3d4-0001-4000-8000-000000000002","receiver_id":"c1b2c3d4-0001-4000-8000-000000000013","booking_id":"h1b2c3d4-0001-4000-8000-000000000003","content":"Hi Ketut, besok 3 couples spa. Bisa mulai jam 10?","is_read":True,"created_at":"2026-03-29T09:30:00Z"},
    {"id":"l1b2c3d4-0001-4000-8000-000000000004","sender_id":"c1b2c3d4-0001-4000-8000-000000000013","receiver_id":"c1b2c3d4-0001-4000-8000-000000000002","booking_id":"h1b2c3d4-0001-4000-8000-000000000003","content":"Bisa Bu, siap jam 10. Terima kasih!","is_read":True,"created_at":"2026-03-29T10:00:00Z"},
    {"id":"l1b2c3d4-0001-4000-8000-000000000005","sender_id":"c1b2c3d4-0001-4000-8000-000000000003","receiver_id":"c1b2c3d4-0001-4000-8000-000000000017","booking_id":"h1b2c3d4-0001-4000-8000-000000000010","content":"Made, party mulai jam 4 sore. Bisa datang jam 2 setup?","is_read":True,"created_at":"2026-04-04T22:30:00Z"},
    {"id":"l1b2c3d4-0001-4000-8000-000000000006","sender_id":"c1b2c3d4-0001-4000-8000-000000000017","receiver_id":"c1b2c3d4-0001-4000-8000-000000000003","booking_id":"h1b2c3d4-0001-4000-8000-000000000010","content":"Siap Pak, datang jam 2. Bawa sound system?","is_read":False,"created_at":"2026-04-04T23:00:00Z"},
    {"id":"l1b2c3d4-0001-4000-8000-000000000007","sender_id":"c1b2c3d4-0001-4000-8000-000000000001","receiver_id":"c1b2c3d4-0001-4000-8000-000000000014","booking_id":"h1b2c3d4-0001-4000-8000-000000000009","content":"Gede, shift malam jam 11pm-7am. 3 rooms check-in.","is_read":True,"created_at":"2026-04-04T20:30:00Z"},
    {"id":"l1b2c3d4-0001-4000-8000-000000000008","sender_id":"c1b2c3d4-0001-4000-8000-000000000020","receiver_id":"c1b2c3d4-0001-4000-8000-000000000004","booking_id":"h1b2c3d4-0001-4000-8000-000000000005","content":"Terima kasih sudah accept. Tur mulai jam 9 pagi.","is_read":True,"created_at":"2026-03-27T09:30:00Z"},
]

NOTIFICATIONS = [
    {"id":"m1b2c3d4-0001-4000-8000-000000000001","user_id":"c1b2c3d4-0001-4000-8000-000000000010","content":"Booking baru! Suite Room Turnover di The Mulia Bali.","is_read":True,"created_at":"2026-04-01T10:00:00Z"},
    {"id":"m1b2c3d4-0001-4000-8000-000000000002","user_id":"c1b2c3d4-0001-4000-8000-000000000010","content":"Pembayaran Rp 250.000 diterima.","is_read":True,"created_at":"2026-04-03T12:00:00Z"},
    {"id":"m1b2c3d4-0001-4000-8000-000000000003","user_id":"c1b2c3d4-0001-4000-8000-000000000001","content":"Wayan Kerta menyelesaikan pekerjaan. Berikan review!","is_read":True,"created_at":"2026-04-03T12:00:00Z"},
    {"id":"m1b2c3d4-0001-4000-8000-000000000004","user_id":"c1b2c3d4-0001-4000-8000-000000000019","content":"Booking baru! Sunday Brunch di Potato Head.","is_read":True,"created_at":"2026-04-04T18:00:00Z"},
    {"id":"m1b2c3d4-0001-4000-8000-000000000005","user_id":"c1b2c3d4-0001-4000-8000-000000000013","content":"Booking baru! Spa Couples di The Mulia. 6 Apr.","is_read":False,"created_at":"2026-04-05T06:00:00Z"},
    {"id":"m1b2c3d4-0001-4000-8000-000000000006","user_id":"c1b2c3d4-0001-4000-8000-000000000017","content":"Pesan baru dari Potato Head tentang event setup.","is_read":False,"created_at":"2026-04-04T23:00:00Z"},
    {"id":"m1b2c3d4-0001-4000-8000-000000000007","user_id":"c1b2c3d4-0001-4000-8000-000000000014","content":"Shift malam The Mulia jam 11pm.","is_read":False,"created_at":"2026-04-05T07:00:00Z"},
    {"id":"m1b2c3d4-0001-4000-8000-000000000008","user_id":"c1b2c3d4-0001-4000-8000-000000000003","content":"Wallet top-up berhasil! Rp 2.000.000 ditambahkan.","is_read":True,"created_at":"2026-03-25T09:00:00Z"},
    {"id":"m1b2c3d4-0001-4000-8000-000000000009","user_id":"c1b2c3d4-0001-4000-8000-000000000012","content":"Booking cancelled: Margarita Night. Dana dikembalikan.","is_read":True,"created_at":"2026-04-02T16:00:00Z"},
]

# ====== MAIN ======
print("🧹 Truncating all tables...")
for t in TRUNCATE_ORDER:
    truncate(t)

print("\n📦 Seeding data...")
insert("categories", CATEGORIES)
insert("skills", SKILLS)
insert("users", USERS)
insert("businesses", BUSINESSES)
insert("workers", WORKERS)
insert("worker_skills", WORKER_SKILLS)
insert("jobs", JOBS)
insert("jobs_skills", JOBS_SKILLS)
insert("wallets", WALLETS)
insert("bookings", BOOKINGS)
insert("reviews", REVIEWS)
insert("messages", MESSAGES)
insert("notifications", NOTIFICATIONS)

print("\n✅ Seed complete!")
