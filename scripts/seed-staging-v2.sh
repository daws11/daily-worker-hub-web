#!/bin/bash
# Seed staging database - FIXED for actual remote schema
# Uses Supabase REST API with service_role key

set -e

SRK="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxbmxycXV0bmh4cWJ6ZmNtdnBjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDEzMTQ1NCwiZXhwIjoyMDg5NzA3NDU0fQ.2xiz11ZhyhebQCcdPadrkpysWsSzpDlJSn8YrvEK0PA"
URL="https://tqnlrqutnhxqbzfcmvpc.supabase.co/rest/v1"
AUTH="Authorization: Bearer $SRK"
API="apikey: $SRK"

# Helper: DELETE all rows
truncate_table() {
  local table=$1
  echo -n "  $table... "
  curl -s -o /dev/null -w "%{http_code}" -X DELETE "$URL/$table?id=not.is.null" -H "$AUTH" -H "$API" 2>/dev/null
  echo ""
}

# Helper: Insert
insert() {
  local table=$1
  local data=$2
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$URL/$table" \
    -H "$AUTH" -H "$API" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d "$data" 2>/dev/null)
  echo "  $table → $code"
}

echo "============================================"
echo "  DWH Staging Seed (Fixed Schema)"
echo "============================================"

# STEP 1: TRUNCATE
echo "📋 Truncating..."
truncate_table "reviews"
truncate_table "messages"
truncate_table "notifications"
truncate_table "reports"
truncate_table "disputes"
truncate_table "webhooks"
truncate_table "wallet_transactions"
truncate_table "payment_transactions"
truncate_table "payout_requests"
truncate_table "withdrawal_requests"
truncate_table "worker_transactions"
truncate_table "worker_wallets"
truncate_table "wallets"
truncate_table "bookings"
truncate_table "transactions"
truncate_table "jobs_skills"
truncate_table "job_applications"
truncate_table "job_posts"
truncate_table "jobs"
truncate_table "worker_skills"
truncate_table "worker_badges"
truncate_table "worker_badge_summary"
truncate_table "worker_achievements"
truncate_table "worker_availabilities"
truncate_table "badges"
truncate_table "business_social_connections"
truncate_table "skills"
truncate_table "categories"
truncate_table "businesses"
truncate_table "workers"
truncate_table "kyc_verifications"
truncate_table "bank_accounts"
truncate_table "notification_preferences"
truncate_table "user_fcm_tokens"
truncate_table "saved_searches"
truncate_table "interview_sessions"
truncate_table "compliance_tracking"
truncate_table "compliance_warnings"
truncate_table "compliance_audit_log"
truncate_table "cancellation_reasons"
truncate_table "admin_audit_logs"
truncate_table "admin_users"
truncate_table "applications"
truncate_table "conversations"
truncate_table "social_platforms"
truncate_table "users"

# STEP 2: CATEGORIES
echo "📋 Categories..."
insert "categories" '[
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
  {"id":"a1b2c3d4-0001-4000-8000-000000000014","name":"Waitstaff","slug":"waitstaff"}
]'

# STEP 3: SKILLS
echo "📋 Skills..."
insert "skills" '[
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
  {"id":"b1b2c3d4-0001-4000-8000-000000000030","name":"Local Knowledge","slug":"local-knowledge"}
]'

# STEP 4: USERS
echo "📋 Users..."
insert "users" '[
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
  {"id":"c1b2c3d4-0001-4000-8000-000000000020","email":"worker11@test.com","full_name":"Ketut Arya","role":"worker","phone":"+6282111111121"}
]'

# STEP 5: BUSINESSES
echo "📋 Businesses..."
insert "businesses" '[
  {"id":"d1b2c3d4-0001-4000-8000-000000000001","user_id":"c1b2c3d4-0001-4000-8000-000000000001","name":"The Mulia Bali","description":"Luxury resort in Nusa Dua with pristine beaches and world-class service. 5-star property with 526 rooms.","phone":"+623617017777","email":"hr@themuliabali.com","website":"https://www.themuliabali.com","is_verified":true,"address":"Kawasan Pariwisata, Nusa Dua, Bali 80363","lat":-8.8011,"lng":115.2373,"business_type":"hotel"},
  {"id":"d1b2c3d4-0001-4000-8000-000000000002","user_id":"c1b2c3d4-0001-4000-8000-000000000002","name":"AYANA Resort Bali","description":"Award-winning resort perched on cliffs above the Indian Ocean in Jimbaran. Features 12 restaurants and bars.","phone":"+62361702222","email":"hr@ayanaresort.com","website":"https://www.ayanaresort.com","is_verified":true,"address":"Jl. Karang Mas Sejahtera, Jimbaran, Bali 80364","lat":-8.8253,"lng":115.1616,"business_type":"resort"},
  {"id":"d1b2c3d4-0001-4000-8000-000000000003","user_id":"c1b2c3d4-0001-4000-8000-000000000003","name":"Potato Head Beach Club","description":"Iconic beach club and hotel in Seminyak. Known for contemporary art, music, and sustainable design.","phone":"+623614737979","email":"hr@potatohead.co","website":"https://www.potatohead.co","is_verified":true,"address":"Jl. Petitenget No.51B, Seminyak, Bali 80361","lat":-8.6922,"lng":115.1497,"business_type":"restaurant"},
  {"id":"d1b2c3d4-0001-4000-8000-000000000004","user_id":"c1b2c3d4-0001-4000-8000-000000000004","name":"Swept Away Resort","description":"Boutique resort in Ubud surrounded by rice terraces. Perfect for wellness retreats and intimate events.","phone":"+62361972338","email":"hr@sweptawayresort.com","website":"https://www.sweptawayresort.com","is_verified":true,"address":"Jl. Raya Sayan, Ubud, Bali 80571","lat":-8.5069,"lng":115.2456,"business_type":"resort"},
  {"id":"d1b2c3d4-0001-4000-8000-000000000005","user_id":"c1b2c3d4-0001-4000-8000-000000000005","name":"Motel Mexicola","description":"Vibrant Mexican-themed restaurant and bar in Seminyak. Popular for events and private dining.","phone":"+62361730899","email":"hr@motelmexicola.com","website":"https://www.motelmexicola.com","is_verified":false,"address":"Jl. Kayu Aya No.5, Seminyak, Bali 80361","lat":-8.6903,"lng":115.1524,"business_type":"restaurant"}
]'

# STEP 6: WORKERS (only columns that exist)
echo "📋 Workers..."
insert "workers" '[
  {"id":"e1b2c3d4-0001-4000-8000-000000000010","user_id":"c1b2c3d4-0001-4000-8000-000000000010","full_name":"Wayan Kerta","bio":"Experienced housekeeper with 8 years at 5-star resorts. Specializes in villa cleaning and guest services.","phone":"+6282111111111","dob":"1990-03-15","address":"Jl. Sunset Road No.45, Seminyak","location_name":"Seminyak, Bali","lat":-8.691,"lng":115.153,"gender":"male","experience_years":8,"jobs_completed":42,"tier":"gold","rating":4.8,"reliability_score":92.5,"kyc_status":"verified","area":"Seminyak"},
  {"id":"e1b2c3d4-0001-4000-8000-000000000011","user_id":"c1b2c3d4-0001-4000-8000-000000000011","full_name":"Made Surya","bio":"New to the platform. Kitchen helper with 2 years experience in local warungs.","phone":"+6282111111112","dob":"1998-07-22","address":"Jl. Teuku Umar No.12, Denpasar","location_name":"Denpasar, Bali","lat":-8.67,"lng":115.21,"gender":"male","experience_years":2,"jobs_completed":3,"tier":"classic","rating":3.5,"reliability_score":55.0,"kyc_status":"verified","area":"Denpasar"},
  {"id":"e1b2c3d4-0001-4000-8000-000000000012","user_id":"c1b2c3d4-0001-4000-8000-000000000012","full_name":"Komang Adi","bio":"Professional bartender with 5 years experience. Trained in cocktail mixing and wine service.","phone":"+6282111111113","dob":"1993-11-08","address":"Jl. Pantai Kuta No.88, Kuta","location_name":"Kuta, Bali","lat":-8.718,"lng":115.168,"gender":"male","experience_years":5,"jobs_completed":28,"tier":"silver","rating":4.5,"reliability_score":85.0,"kyc_status":"verified","area":"Kuta"},
  {"id":"e1b2c3d4-0001-4000-8000-000000000013","user_id":"c1b2c3d4-0001-4000-8000-000000000013","full_name":"Ketut Rai","bio":"Spa therapist certified in Balinese massage, aromatherapy, and facial treatments. 6 years experience.","phone":"+6282111111114","dob":"1992-01-30","address":"Jl. Raya Ubud No.35, Ubud","location_name":"Ubud, Bali","lat":-8.5069,"lng":115.2634,"gender":"female","experience_years":6,"jobs_completed":48,"tier":"gold","rating":4.9,"reliability_score":95.0,"kyc_status":"verified","area":"Ubud"},
  {"id":"e1b2c3d4-0001-4000-8000-000000000014","user_id":"c1b2c3d4-0001-4000-8000-000000000014","full_name":"Gede Wibawa","bio":"Front desk agent fluent in English and Japanese. 4 years at international chain hotels.","phone":"+6282111111115","dob":"1995-05-14","address":"Jl. By Pass Ngurah Rai No.120, Sanur","location_name":"Sanur, Bali","lat":-8.708,"lng":115.262,"gender":"male","experience_years":4,"jobs_completed":20,"tier":"silver","rating":4.2,"reliability_score":78.0,"kyc_status":"verified","area":"Sanur"},
  {"id":"e1b2c3d4-0001-4000-8000-000000000015","user_id":"c1b2c3d4-0001-4000-8000-000000000015","full_name":"Nyoman Putra","bio":"Security guard with SIA certification. 7 years experience in hotel and resort security.","phone":"+6282111111116","dob":"1988-09-03","address":"Jl. Uluwatu No.55, Jimbaran","location_name":"Jimbaran, Bali","lat":-8.796,"lng":115.171,"gender":"male","experience_years":7,"jobs_completed":35,"tier":"silver","rating":4.3,"reliability_score":82.0,"kyc_status":"verified","area":"Jimbaran"},
  {"id":"e1b2c3d4-0001-4000-8000-000000000016","user_id":"c1b2c3d4-0001-4000-8000-000000000016","full_name":"Wayan Sudarma","bio":"Gardener and landscaper specializing in tropical gardens and Balinese landscape design. 10 years experience.","phone":"+6282111111117","dob":"1985-12-20","address":"Jl. Raya Canggu No.78, Canggu","location_name":"Canggu, Bali","lat":-8.649,"lng":115.138,"gender":"male","experience_years":10,"jobs_completed":27,"tier":"gold","rating":4.6,"reliability_score":88.0,"kyc_status":"verified","area":"Canggu"},
  {"id":"e1b2c3d4-0001-4000-8000-000000000017","user_id":"c1b2c3d4-0001-4000-8000-000000000017","full_name":"Made Suarjana","bio":"Event staff and AV technician. Experienced in weddings, corporate events, and beach parties.","phone":"+6282111111118","dob":"1994-06-11","address":"Jl. Pantai Berawa No.22, Canggu","location_name":"Canggu, Bali","lat":-8.654,"lng":115.145,"gender":"male","experience_years":3,"jobs_completed":15,"tier":"classic","rating":4.0,"reliability_score":70.0,"kyc_status":"verified","area":"Canggu"},
  {"id":"e1b2c3d4-0001-4000-8000-000000000018","user_id":"c1b2c3d4-0001-4000-8000-000000000018","full_name":"Putu Eka","bio":"Pool maintenance technician. Certified in water chemistry and pool equipment repair. 5 years experience.","phone":"+6282111111119","dob":"1991-04-25","address":"Jl. Nusa Dua Selatan No.15, Nusa Dua","location_name":"Nusa Dua, Bali","lat":-8.806,"lng":115.24,"gender":"male","experience_years":5,"jobs_completed":23,"tier":"silver","rating":4.4,"reliability_score":83.0,"kyc_status":"verified","area":"Nusa Dua"},
  {"id":"e1b2c3d4-0001-4000-8000-000000000019","user_id":"c1b2c3d4-0001-4000-8000-000000000019","full_name":"Komang Dwi","bio":"Waitstaff and F&B service. Trained in fine dining service standards. 3 years experience.","phone":"+6282111111120","dob":"1996-08-17","address":"Jl. Seminyak Square No.8, Seminyak","location_name":"Seminyak, Bali","lat":-8.688,"lng":115.155,"gender":"female","experience_years":3,"jobs_completed":30,"tier":"silver","rating":4.5,"reliability_score":86.0,"kyc_status":"verified","area":"Seminyak"},
  {"id":"e1b2c3d4-0001-4000-8000-000000000020","user_id":"c1b2c3d4-0001-4000-8000-000000000020","full_name":"Ketut Arya","bio":"Tour guide licensed by Bali Tourism Board. Specializes in cultural tours, temple visits, and adventure trips.","phone":"+6282111111121","dob":"1989-02-14","address":"Jl. Monkey Forest No.66, Ubud","location_name":"Ubud, Bali","lat":-8.5085,"lng":115.2585,"gender":"male","experience_years":8,"jobs_completed":38,"tier":"gold","rating":4.7,"reliability_score":90.0,"kyc_status":"verified","area":"Ubud"}
]'

# STEP 7: WORKER SKILLS
echo "📋 Worker skills..."
insert "worker_skills" '[
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
  {"worker_id":"e1b2c3d4-0001-4000-8000-000000000020","skill_id":"b1b2c3d4-0001-4000-8000-000000000030"}
]'

# STEP 8: JOBS (only existing columns)
echo "📋 Jobs..."
insert "jobs" '[
  {"id":"f1b2c3d4-0001-4000-8000-000000000001","business_id":"d1b2c3d4-0001-4000-8000-000000000001","category_id":"a1b2c3d4-0001-4000-8000-000000000001","title":"Housekeeping - Villa Cleaning (3 Villas)","description":"Deep cleaning for 3 luxury pool villas. Change all linens, clean bathrooms, polish surfaces, and arrange amenities.","requirements":"Experience with 5-star villa cleaning. Attention to detail.","budget_min":350000,"budget_max":500000,"status":"open","deadline":"2026-04-07","address":"Kawasan Pariwisata, Nusa Dua","lat":-8.8011,"lng":115.2373,"is_urgent":true},
  {"id":"f1b2c3d4-0001-4000-8000-000000000002","business_id":"d1b2c3d4-0001-4000-8000-000000000001","category_id":"a1b2c3d4-0001-4000-8000-000000000001","title":"Housekeeping - Suite Room Turnover","description":"Standard turnover cleaning for 12 suite rooms. Linen change, bathroom cleaning, restock minibar.","requirements":"Housekeeping experience required.","budget_min":200000,"budget_max":300000,"status":"completed","deadline":"2026-04-03","address":"Kawasan Pariwisata, Nusa Dua","lat":-8.8011,"lng":115.2373},
  {"id":"f1b2c3d4-0001-4000-8000-000000000003","business_id":"d1b2c3d4-0001-4000-8000-000000000002","category_id":"a1b2c3d4-0001-4000-8000-000000000005","title":"Bartender - Beachside Bar","description":"Mix and serve cocktails at our cliff-edge beach bar. Busy evening shift with 80+ expected guests.","requirements":"3+ years bartending. Cocktail certification preferred.","budget_min":300000,"budget_max":450000,"status":"open","deadline":"2026-04-06","address":"Jl. Karang Mas Sejahtera, Jimbaran","lat":-8.8253,"lng":115.1616},
  {"id":"f1b2c3d4-0001-4000-8000-000000000004","business_id":"d1b2c3d4-0001-4000-8000-000000000002","category_id":"a1b2c3d4-0001-4000-8000-000000000002","title":"F&B Waitstaff - Fine Dining","description":"Serve dinner at our signature restaurant. 5-course tasting menu service for 40 guests. Formal attire required.","requirements":"Fine dining experience. English fluency.","budget_min":250000,"budget_max":350000,"status":"completed","deadline":"2026-04-02","address":"Jl. Karang Mas Sejahtera, Jimbaran","lat":-8.8253,"lng":115.1616},
  {"id":"f1b2c3d4-0001-4000-8000-000000000005","business_id":"d1b2c3d4-0001-4000-8000-000000000003","category_id":"a1b2c3d4-0001-4000-8000-000000000010","title":"Event Staff - Beach Wedding Setup","description":"Help set up beach wedding for 150 guests. Table setup, decoration, AV equipment, and breakdown.","requirements":"Event setup experience. Able to lift 20kg.","budget_min":400000,"budget_max":600000,"status":"open","deadline":"2026-04-08","address":"Jl. Petitenget No.51B, Seminyak","lat":-8.6922,"lng":115.1497},
  {"id":"f1b2c3d4-0001-4000-8000-000000000006","business_id":"d1b2c3d4-0001-4000-8000-000000000003","category_id":"a1b2c3d4-0001-4000-8000-000000000002","title":"F&B Service - Sunday Brunch","description":"Buffet service for Sunday brunch. 200 expected guests. Food running, table clearing, drink refills.","requirements":"F&B service experience. Friendly personality.","budget_min":200000,"budget_max":300000,"status":"in_progress","deadline":"2026-04-05","address":"Jl. Petitenget No.51B, Seminyak","lat":-8.6922,"lng":115.1497},
  {"id":"f1b2c3d4-0001-4000-8000-000000000007","business_id":"d1b2c3d4-0001-4000-8000-000000000004","category_id":"a1b2c3d4-0001-4000-8000-000000000009","title":"Spa Therapist - Balinese Massage","description":"Provide traditional Balinese massage and aromatherapy sessions. 4-6 sessions expected.","requirements":"Certified massage therapist. Balinese massage training.","budget_min":400000,"budget_max":600000,"status":"completed","deadline":"2026-04-01","address":"Jl. Raya Sayan, Ubud","lat":-8.5069,"lng":115.2456},
  {"id":"f1b2c3d4-0001-4000-8000-000000000008","business_id":"d1b2c3d4-0001-4000-8000-000000000004","category_id":"a1b2c3d4-0001-4000-8000-000000000006","title":"Gardener - Tropical Garden Maintenance","description":"Maintain resort tropical gardens. Pruning, weeding, planting new flowers along pathways.","requirements":"Gardening experience. Knowledge of tropical plants.","budget_min":175000,"budget_max":250000,"status":"open","deadline":"2026-04-06","address":"Jl. Raya Sayan, Ubud","lat":-8.5069,"lng":115.2456},
  {"id":"f1b2c3d4-0001-4000-8000-000000000009","business_id":"d1b2c3d4-0001-4000-8000-000000000005","category_id":"a1b2c3d4-0001-4000-8000-000000000004","title":"Kitchen Prep Cook - Taco Night","description":"Prep cook for our popular Taco Tuesday event. Prep 200+ portions of ingredients.","requirements":"Kitchen experience. Food handling certificate.","budget_min":225000,"budget_max":325000,"status":"open","deadline":"2026-04-08","address":"Jl. Kayu Aya No.5, Seminyak","lat":-8.6903,"lng":115.1524},
  {"id":"f1b2c3d4-0001-4000-8000-000000000010","business_id":"d1b2c3d4-0001-4000-8000-000000000005","category_id":"a1b2c3d4-0001-4000-8000-000000000005","title":"Bartender - Margarita Night","description":"Bartender for themed margarita night. Creative cocktail skills and flair bartending needed.","requirements":"Bartending experience. Fun personality.","budget_min":275000,"budget_max":400000,"status":"cancelled","deadline":"2026-04-03","address":"Jl. Kayu Aya No.5, Seminyak","lat":-8.6903,"lng":115.1524},
  {"id":"f1b2c3d4-0001-4000-8000-000000000011","business_id":"d1b2c3d4-0001-4000-8000-000000000001","category_id":"a1b2c3d4-0001-4000-8000-000000000007","title":"Pool Maintenance - Infinity Pool","description":"Full cleaning and chemical balance check for 3 infinity pools. Filter cleaning, tile scrubbing.","requirements":"Pool maintenance certification. Chemical handling knowledge.","budget_min":300000,"budget_max":450000,"status":"open","deadline":"2026-04-07","address":"Kawasan Pariwisata, Nusa Dua","lat":-8.8011,"lng":115.2373},
  {"id":"f1b2c3d4-0001-4000-8000-000000000012","business_id":"d1b2c3d4-0001-4000-8000-000000000001","category_id":"a1b2c3d4-0001-4000-8000-000000000003","title":"Front Desk - Night Shift","description":"Night shift front desk agent. Check-in/check-out, guest inquiries, phone handling, and nightly audit.","requirements":"Front desk experience. English fluency. Night shift availability.","budget_min":250000,"budget_max":350000,"status":"in_progress","deadline":"2026-04-05","address":"Kawasan Pariwisata, Nusa Dua","lat":-8.8011,"lng":115.2373},
  {"id":"f1b2c3d4-0001-4000-8000-000000000013","business_id":"d1b2c3d4-0001-4000-8000-000000000002","category_id":"a1b2c3d4-0001-4000-8000-000000000008","title":"Security - Cliff Edge Patrol","description":"Patrol resort perimeter including cliff edges and beach access points. Monitor CCTV and guest safety.","requirements":"Security certification. Fit and alert.","budget_min":225000,"budget_max":325000,"status":"completed","deadline":"2026-04-02","address":"Jl. Karang Mas Sejahtera, Jimbaran","lat":-8.8253,"lng":115.1616},
  {"id":"f1b2c3d4-0001-4000-8000-000000000014","business_id":"d1b2c3d4-0001-4000-8000-000000000004","category_id":"a1b2c3d4-0001-4000-8000-000000000013","title":"Tour Guide - Ubud Cultural Walk","description":"Lead 3-hour cultural walking tour through Ubud. Visit temples, rice terraces, and local artisan workshops.","requirements":"Licensed tour guide. English fluency. Local knowledge.","budget_min":350000,"budget_max":500000,"status":"completed","deadline":"2026-03-30","address":"Jl. Raya Sayan, Ubud","lat":-8.5069,"lng":115.2456},
  {"id":"f1b2c3d4-0001-4000-8000-000000000015","business_id":"d1b2c3d4-0001-4000-8000-000000000003","category_id":"a1b2c3d4-0001-4000-8000-000000000001","title":"Housekeeping - Deep Clean (20 Rooms)","description":"Deep cleaning of 20 rooms after large group checkout. Full linen change, bathroom deep clean, carpet vacuuming.","requirements":"Housekeeping experience. Able to work fast.","budget_min":275000,"budget_max":400000,"status":"open","deadline":"2026-04-06","address":"Jl. Petitenget No.51B, Seminyak","lat":-8.6922,"lng":115.1497,"is_urgent":true},
  {"id":"f1b2c3d4-0001-4000-8000-000000000016","business_id":"d1b2c3d4-0001-4000-8000-000000000002","category_id":"a1b2c3d4-0001-4000-8000-000000000004","title":"Kitchen - Banquet Prep (100 Pax)","description":"Prep cook for corporate banquet. Indonesian and international menu. Food prep and plating.","requirements":"Commercial kitchen experience.","budget_min":300000,"budget_max":450000,"status":"open","deadline":"2026-04-09","address":"Jl. Karang Mas Sejahtera, Jimbaran","lat":-8.8253,"lng":115.1616},
  {"id":"f1b2c3d4-0001-4000-8000-000000000017","business_id":"d1b2c3d4-0001-4000-8000-000000000001","category_id":"a1b2c3d4-0001-4000-8000-000000000002","title":"F&B Service - Pool Bar","description":"Serve drinks and light meals at pool bar. Casual service, 50+ guests expected. All-day shift.","requirements":"F&B experience. Swimming ability preferred.","budget_min":200000,"budget_max":300000,"status":"completed","deadline":"2026-04-01","address":"Kawasan Pariwisata, Nusa Dua","lat":-8.8011,"lng":115.2373},
  {"id":"f1b2c3d4-0001-4000-8000-000000000018","business_id":"d1b2c3d4-0001-4000-8000-000000000004","category_id":"a1b2c3d4-0001-4000-8000-000000000012","title":"Maintenance - AC Repair (8 Units)","description":"Repair and service 8 split AC units across resort villas. Replace filters, check refrigerant, clean coils.","requirements":"AC repair certification. Own tools preferred.","budget_min":400000,"budget_max":600000,"status":"open","deadline":"2026-04-07","address":"Jl. Raya Sayan, Ubud","lat":-8.5069,"lng":115.2456},
  {"id":"f1b2c3d4-0001-4000-8000-000000000019","business_id":"d1b2c3d4-0001-4000-8000-000000000005","category_id":"a1b2c3d4-0001-4000-8000-000000000010","title":"Event Staff - Private Party Setup","description":"Setup for private birthday party. 40 guests, Mexican-themed decorations, sound system setup.","requirements":"Event experience. Creative eye for decorations.","budget_min":350000,"budget_max":500000,"status":"in_progress","deadline":"2026-04-05","address":"Jl. Kayu Aya No.5, Seminyak","lat":-8.6903,"lng":115.1524},
  {"id":"f1b2c3d4-0001-4000-8000-000000000020","business_id":"d1b2c3d4-0001-4000-8000-000000000001","category_id":"a1b2c3d4-0001-4000-8000-000000000009","title":"Spa Therapist - Couples Package","description":"Provide couples spa package including massage, body scrub, and flower bath. 3 couples scheduled.","requirements":"Certified therapist. Couples massage training.","budget_min":500000,"budget_max":700000,"status":"open","deadline":"2026-04-06","address":"Kawasan Pariwisata, Nusa Dua","lat":-8.8011,"lng":115.2373},
  {"id":"f1b2c3d4-0001-4000-8000-000000000021","business_id":"d1b2c3d4-0001-4000-8000-000000000002","category_id":"a1b2c3d4-0001-4000-8000-000000000011","title":"Laundry - Hotel Linen Service","description":"Process bulk hotel laundry. Wash, dry, iron and fold 200+ sets of bed linens and towels.","requirements":"Laundry experience. Fast and efficient.","budget_min":175000,"budget_max":250000,"status":"completed","deadline":"2026-04-03","address":"Jl. Karang Mas Sejahtera, Jimbaran","lat":-8.8253,"lng":115.1616},
  {"id":"f1b2c3d4-0001-4000-8000-000000000022","business_id":"d1b2c3d4-0001-4000-8000-000000000003","category_id":"a1b2c3d4-0001-4000-8000-000000000014","title":"Waitstaff - Sunset Dinner Service","description":"Serve at beachfront sunset dinner. 60 guests, 4-course menu with wine pairing. Formal service.","requirements":"Waitstaff experience. Wine knowledge a plus.","budget_min":250000,"budget_max":375000,"status":"open","deadline":"2026-04-06","address":"Jl. Petitenget No.51B, Seminyak","lat":-8.6922,"lng":115.1497}
]'

# STEP 9: JOBS-SKILLS
echo "📋 Jobs-Skills..."
insert "jobs_skills" '[
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
  {"job_id":"f1b2c3d4-0001-4000-8000-000000000022","skill_id":"b1b2c3d4-0001-4000-8000-000000000006"}
]'

# STEP 10: WALLETS
echo "📋 Wallets..."
insert "wallets" '[
  {"id":"g1b2c3d4-0001-4000-8000-000000000001","user_id":"c1b2c3d4-0001-4000-8000-000000000001","business_id":"d1b2c3d4-0001-4000-8000-000000000001","balance":5000000,"pending_balance":550000,"available_balance":4450000,"currency":"IDR","is_active":true},
  {"id":"g1b2c3d4-0001-4000-8000-000000000002","user_id":"c1b2c3d4-0001-4000-8000-000000000002","business_id":"d1b2c3d4-0001-4000-8000-000000000002","balance":3500000,"pending_balance":0,"available_balance":3500000,"currency":"IDR","is_active":true},
  {"id":"g1b2c3d4-0001-4000-8000-000000000003","user_id":"c1b2c3d4-0001-4000-8000-000000000003","business_id":"d1b2c3d4-0001-4000-8000-000000000003","balance":2000000,"pending_balance":250000,"available_balance":1750000,"currency":"IDR","is_active":true},
  {"id":"g1b2c3d4-0001-4000-8000-000000000004","user_id":"c1b2c3d4-0001-4000-8000-000000000004","business_id":"d1b2c3d4-0001-4000-8000-000000000004","balance":1500000,"pending_balance":0,"available_balance":1500000,"currency":"IDR","is_active":true},
  {"id":"g1b2c3d4-0001-4000-8000-000000000005","user_id":"c1b2c3d4-0001-4000-8000-000000000005","business_id":"d1b2c3d4-0001-4000-8000-000000000005","balance":475000,"pending_balance":0,"available_balance":475000,"currency":"IDR","is_active":true},
  {"id":"g1b2c3d4-0001-4000-8000-000000000010","user_id":"c1b2c3d4-0001-4000-8000-000000000010","worker_id":"e1b2c3d4-0001-4000-8000-000000000010","balance":1850000,"pending_balance":250000,"available_balance":1600000,"currency":"IDR","is_active":true},
  {"id":"g1b2c3d4-0001-4000-8000-000000000011","user_id":"c1b2c3d4-0001-4000-8000-000000000011","worker_id":"e1b2c3d4-0001-4000-8000-000000000011","balance":200000,"pending_balance":0,"available_balance":200000,"currency":"IDR","is_active":true},
  {"id":"g1b2c3d4-0001-4000-8000-000000000012","user_id":"c1b2c3d4-0001-4000-8000-000000000012","worker_id":"e1b2c3d4-0001-4000-8000-000000000012","balance":1420000,"pending_balance":0,"available_balance":1420000,"currency":"IDR","is_active":true},
  {"id":"g1b2c3d4-0001-4000-8000-000000000013","user_id":"c1b2c3d4-0001-4000-8000-000000000013","worker_id":"e1b2c3d4-0001-4000-8000-000000000013","balance":2280000,"pending_balance":550000,"available_balance":1730000,"currency":"IDR","is_active":true},
  {"id":"g1b2c3d4-0001-4000-8000-000000000014","user_id":"c1b2c3d4-0001-4000-8000-000000000014","worker_id":"e1b2c3d4-0001-4000-8000-000000000014","balance":960000,"pending_balance":300000,"available_balance":660000,"currency":"IDR","is_active":true},
  {"id":"g1b2c3d4-0001-4000-8000-000000000015","user_id":"c1b2c3d4-0001-4000-8000-000000000015","worker_id":"e1b2c3d4-0001-4000-8000-000000000015","balance":1375000,"pending_balance":0,"available_balance":1375000,"currency":"IDR","is_active":true},
  {"id":"g1b2c3d4-0001-4000-8000-000000000016","user_id":"c1b2c3d4-0001-4000-8000-000000000016","worker_id":"e1b2c3d4-0001-4000-8000-000000000016","balance":780000,"pending_balance":0,"available_balance":780000,"currency":"IDR","is_active":true},
  {"id":"g1b2c3d4-0001-4000-8000-000000000017","user_id":"c1b2c3d4-0001-4000-8000-000000000017","worker_id":"e1b2c3d4-0001-4000-8000-000000000017","balance":550000,"pending_balance":0,"available_balance":550000,"currency":"IDR","is_active":true},
  {"id":"g1b2c3d4-0001-4000-8000-000000000018","user_id":"c1b2c3d4-0001-4000-8000-000000000018","worker_id":"e1b2c3d4-0001-4000-8000-000000000018","balance":670000,"pending_balance":0,"available_balance":670000,"currency":"IDR","is_active":true},
  {"id":"g1b2c3d4-0001-4000-8000-000000000019","user_id":"c1b2c3d4-0001-4000-8000-000000000019","worker_id":"e1b2c3d4-0001-4000-8000-000000000019","balance":800000,"pending_balance":0,"available_balance":800000,"currency":"IDR","is_active":true},
  {"id":"g1b2c3d4-0001-4000-8000-000000000020","user_id":"c1b2c3d4-0001-4000-8000-000000000020","worker_id":"e1b2c3d4-0001-4000-8000-000000000020","balance":1270000,"pending_balance":0,"available_balance":1270000,"currency":"IDR","is_active":true}
]'

# STEP 11: BOOKINGS
echo "📋 Bookings..."
insert "bookings" '[
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
  {"id":"h1b2c3d4-0001-4000-8000-000000000012","job_id":"f1b2c3d4-0001-4000-8000-000000000020","worker_id":"e1b2c3d4-0001-4000-8000-000000000013","business_id":"d1b2c3d4-0001-4000-8000-000000000001","status":"pending","start_date":"2026-04-06","end_date":"2026-04-06","final_price":550000,"payment_status":"pending","created_at":"2026-04-05T06:00:00Z"}
]'

# STEP 12: PAYMENT TRANSACTIONS
echo "📋 Payment transactions..."
insert "payment_transactions" '[
  {"id":"i1b2c3d4-0001-4000-8000-000000000001","business_id":"d1b2c3d4-0001-4000-8000-000000000001","amount":5000000,"fee_amount":25000,"type":"credit","status":"success","payment_provider":"xendit_qris","provider_payment_id":"xnd_qris_001","paid_at":"2026-03-20T10:00:00Z","created_at":"2026-03-20T09:55:00Z"},
  {"id":"i1b2c3d4-0001-4000-8000-000000000002","business_id":"d1b2c3d4-0001-4000-8000-000000000002","amount":3500000,"fee_amount":17500,"type":"credit","status":"success","payment_provider":"xendit_qris","provider_payment_id":"xnd_qris_002","paid_at":"2026-03-22T14:00:00Z","created_at":"2026-03-22T13:55:00Z"},
  {"id":"i1b2c3d4-0001-4000-8000-000000000003","business_id":"d1b2c3d4-0001-4000-8000-000000000003","amount":2000000,"fee_amount":10000,"type":"credit","status":"success","payment_provider":"xendit_va","provider_payment_id":"xnd_va_003","paid_at":"2026-03-25T09:00:00Z","created_at":"2026-03-25T08:50:00Z"},
  {"id":"i1b2c3d4-0001-4000-8000-000000000004","business_id":"d1b2c3d4-0001-4000-8000-000000000004","amount":1500000,"fee_amount":7500,"type":"credit","status":"success","payment_provider":"xendit_va","provider_payment_id":"xnd_va_004","paid_at":"2026-03-28T11:00:00Z","created_at":"2026-03-28T10:55:00Z"},
  {"id":"i1b2c3d4-0001-4000-8000-000000000005","business_id":"d1b2c3d4-0001-4000-8000-000000000005","amount":750000,"fee_amount":3750,"type":"credit","status":"success","payment_provider":"xendit_qris","provider_payment_id":"xnd_qris_005","paid_at":"2026-04-01T16:00:00Z","created_at":"2026-04-01T15:55:00Z"},
  {"id":"i1b2c3d4-0001-4000-8000-000000000006","business_id":"d1b2c3d4-0001-4000-8000-000000000001","amount":1500000,"fee_amount":7500,"type":"pending","status":"expired","payment_provider":"xendit_qris","provider_payment_id":"xnd_qris_006","created_at":"2026-04-02T08:00:00Z"}
]'

# STEP 13: WALLET TRANSACTIONS
echo "📋 Wallet transactions..."
insert "wallet_transactions" '[
  {"id":"j1b2c3d4-0001-4000-8000-000000000001","wallet_id":"g1b2c3d4-0001-4000-8000-000000000001","booking_id":"h1b2c3d4-0001-4000-8000-000000000001","amount":250000,"type":"hold","status":"released","description":"Hold for booking #001 - Suite Room Turnover","created_at":"2026-04-01T10:00:00Z"},
  {"id":"j1b2c3d4-0001-4000-8000-000000000002","wallet_id":"g1b2c3d4-0001-4000-8000-000000000010","booking_id":"h1b2c3d4-0001-4000-8000-000000000001","amount":250000,"type":"earn","status":"available","description":"Payment for booking #001 - Suite Room Turnover","created_at":"2026-04-03T12:00:00Z"},
  {"id":"j1b2c3d4-0001-4000-8000-000000000003","wallet_id":"g1b2c3d4-0001-4000-8000-000000000002","booking_id":"h1b2c3d4-0001-4000-8000-000000000002","amount":300000,"type":"hold","status":"released","description":"Hold for booking #002 - Fine Dining","created_at":"2026-03-31T14:00:00Z"},
  {"id":"j1b2c3d4-0001-4000-8000-000000000004","wallet_id":"g1b2c3d4-0001-4000-8000-000000000019","booking_id":"h1b2c3d4-0001-4000-8000-000000000002","amount":300000,"type":"earn","status":"available","description":"Payment for booking #002 - Fine Dining","created_at":"2026-04-02T22:00:00Z"},
  {"id":"j1b2c3d4-0001-4000-8000-000000000005","wallet_id":"g1b2c3d4-0001-4000-8000-000000000004","booking_id":"h1b2c3d4-0001-4000-8000-000000000003","amount":500000,"type":"hold","status":"released","description":"Hold for booking #003 - Spa Treatment","created_at":"2026-03-29T09:00:00Z"},
  {"id":"j1b2c3d4-0001-4000-8000-000000000006","wallet_id":"g1b2c3d4-0001-4000-8000-000000000013","booking_id":"h1b2c3d4-0001-4000-8000-000000000003","amount":500000,"type":"earn","status":"available","description":"Payment for booking #003 - Balinese Massage","created_at":"2026-04-01T18:00:00Z"},
  {"id":"j1b2c3d4-0001-4000-8000-000000000007","wallet_id":"g1b2c3d4-0001-4000-8000-000000000002","booking_id":"h1b2c3d4-0001-4000-8000-000000000004","amount":275000,"type":"hold","status":"released","description":"Hold for booking #004 - Security","created_at":"2026-03-31T11:00:00Z"},
  {"id":"j1b2c3d4-0001-4000-8000-000000000008","wallet_id":"g1b2c3d4-0001-4000-8000-000000000015","booking_id":"h1b2c3d4-0001-4000-8000-000000000004","amount":275000,"type":"earn","status":"available","description":"Payment for booking #004 - Security Patrol","created_at":"2026-04-02T18:00:00Z"},
  {"id":"j1b2c3d4-0001-4000-8000-000000000009","wallet_id":"g1b2c3d4-0001-4000-8000-000000000004","booking_id":"h1b2c3d4-0001-4000-8000-000000000005","amount":450000,"type":"hold","status":"released","description":"Hold for booking #005 - Tour Guide","created_at":"2026-03-27T08:00:00Z"},
  {"id":"j1b2c3d4-0001-4000-8000-000000000010","wallet_id":"g1b2c3d4-0001-4000-8000-000000000020","booking_id":"h1b2c3d4-0001-4000-8000-000000000005","amount":450000,"type":"earn","status":"available","description":"Payment for booking #005 - Cultural Walk","created_at":"2026-03-30T16:00:00Z"},
  {"id":"j1b2c3d4-0001-4000-8000-000000000011","wallet_id":"g1b2c3d4-0001-4000-8000-000000000001","booking_id":"h1b2c3d4-0001-4000-8000-000000000006","amount":250000,"type":"hold","status":"released","description":"Hold for booking #006 - Pool Bar","created_at":"2026-03-29T16:00:00Z"},
  {"id":"j1b2c3d4-0001-4000-8000-000000000012","wallet_id":"g1b2c3d4-0001-4000-8000-000000000019","booking_id":"h1b2c3d4-0001-4000-8000-000000000006","amount":250000,"type":"earn","status":"available","description":"Payment for booking #006 - Pool Bar","created_at":"2026-04-01T20:00:00Z"},
  {"id":"j1b2c3d4-0001-4000-8000-000000000013","wallet_id":"g1b2c3d4-0001-4000-8000-000000000002","booking_id":"h1b2c3d4-0001-4000-8000-000000000007","amount":200000,"type":"hold","status":"released","description":"Hold for booking #007 - Laundry","created_at":"2026-04-01T07:00:00Z"},
  {"id":"j1b2c3d4-0001-4000-8000-000000000014","wallet_id":"g1b2c3d4-0001-4000-8000-000000000011","booking_id":"h1b2c3d4-0001-4000-8000-000000000007","amount":200000,"type":"earn","status":"available","description":"Payment for booking #007 - Linen Service","created_at":"2026-04-03T14:00:00Z"},
  {"id":"j1b2c3d4-0001-4000-8000-000000000015","wallet_id":"g1b2c3d4-0001-4000-8000-000000000003","booking_id":"h1b2c3d4-0001-4000-8000-000000000008","amount":250000,"type":"hold","status":"pending_review","description":"Hold for booking #008 - Sunday Brunch","created_at":"2026-04-04T18:00:00Z"},
  {"id":"j1b2c3d4-0001-4000-8000-000000000016","wallet_id":"g1b2c3d4-0001-4000-8000-000000000001","booking_id":"h1b2c3d4-0001-4000-8000-000000000009","amount":300000,"type":"hold","status":"pending_review","description":"Hold for booking #009 - Night Shift","created_at":"2026-04-04T20:00:00Z"},
  {"id":"j1b2c3d4-0001-4000-8000-000000000017","wallet_id":"g1b2c3d4-0001-4000-8000-000000000005","booking_id":"h1b2c3d4-0001-4000-8000-000000000010","amount":400000,"type":"hold","status":"pending_review","description":"Hold for booking #010 - Event Setup","created_at":"2026-04-04T22:00:00Z"},
  {"id":"j1b2c3d4-0001-4000-8000-000000000018","wallet_id":"g1b2c3d4-0001-4000-8000-000000000005","booking_id":"h1b2c3d4-0001-4000-8000-000000000011","amount":275000,"type":"hold","status":"released","description":"Hold for cancelled booking #011","created_at":"2026-04-02T15:00:00Z"},
  {"id":"j1b2c3d4-0001-4000-8000-000000000019","wallet_id":"g1b2c3d4-0001-4000-8000-000000000005","booking_id":"h1b2c3d4-0001-4000-8000-000000000011","amount":275000,"type":"refund","status":"released","description":"Refund for cancelled booking #011","created_at":"2026-04-02T16:00:00Z"},
  {"id":"j1b2c3d4-0001-4000-8000-000000000020","wallet_id":"g1b2c3d4-0001-4000-8000-000000000001","booking_id":"h1b2c3d4-0001-4000-8000-000000000012","amount":550000,"type":"hold","status":"pending_review","description":"Hold for booking #012 - Spa Couples","created_at":"2026-04-05T06:00:00Z"}
]'

# STEP 14: REVIEWS
echo "📋 Reviews..."
insert "reviews" '[
  {"id":"k1b2c3d4-0001-4000-8000-000000000001","booking_id":"h1b2c3d4-0001-4000-8000-000000000001","worker_id":"e1b2c3d4-0001-4000-8000-000000000010","rating":5,"comment":"Wayan is exceptional! The villas were spotless and ready well before check-in. Will definitely request again.","created_at":"2026-04-03T15:00:00Z"},
  {"id":"k1b2c3d4-0001-4000-8000-000000000002","booking_id":"h1b2c3d4-0001-4000-8000-000000000002","worker_id":"e1b2c3d4-0001-4000-8000-000000000019","rating":4,"comment":"Good service during dinner. Professional and punctual. Needs a bit more wine knowledge.","created_at":"2026-04-02T22:30:00Z"},
  {"id":"k1b2c3d4-0001-4000-8000-000000000003","booking_id":"h1b2c3d4-0001-4000-8000-000000000003","worker_id":"e1b2c3d4-0001-4000-8000-000000000013","rating":5,"comment":"Best massage therapist we have worked with. Guests loved the treatment. Highly recommended!","created_at":"2026-04-01T18:30:00Z"},
  {"id":"k1b2c3d4-0001-4000-8000-000000000004","booking_id":"h1b2c3d4-0001-4000-8000-000000000004","worker_id":"e1b2c3d4-0001-4000-8000-000000000015","rating":4,"comment":"Reliable security guard. Professional and thorough in patrol duties.","created_at":"2026-04-02T19:00:00Z"},
  {"id":"k1b2c3d4-0001-4000-8000-000000000005","booking_id":"h1b2c3d4-0001-4000-8000-000000000005","worker_id":"e1b2c3d4-0001-4000-8000-000000000020","rating":5,"comment":"Ketut is an amazing tour guide! Our guests loved the cultural insights and hidden gems.","created_at":"2026-03-30T17:00:00Z"},
  {"id":"k1b2c3d4-0001-4000-8000-000000000006","booking_id":"h1b2c3d4-0001-4000-8000-000000000006","worker_id":"e1b2c3d4-0001-4000-8000-000000000019","rating":4,"comment":"Great pool bar service. Friendly and efficient. Would hire again.","created_at":"2026-04-01T20:30:00Z"},
  {"id":"k1b2c3d4-0001-4000-8000-000000000007","booking_id":"h1b2c3d4-0001-4000-8000-000000000007","worker_id":"e1b2c3d4-0001-4000-8000-000000000011","rating":3,"comment":"Decent work but could be faster. Linen was done correctly though.","created_at":"2026-04-03T15:30:00Z"}
]'

# STEP 15: MESSAGES
echo "📋 Messages..."
insert "messages" '[
  {"id":"l1b2c3d4-0001-4000-8000-000000000001","sender_id":"c1b2c3d4-0001-4000-8000-000000000001","receiver_id":"c1b2c3d4-0001-4000-8000-000000000010","booking_id":"h1b2c3d4-0001-4000-8000-000000000001","content":"Hi Wayan, terima kasih sudah accept. Villas ada di blok A nomor 3, 5, dan 7. Kunci bisa ambil di front desk.","is_read":true,"created_at":"2026-04-01T10:30:00Z"},
  {"id":"l1b2c3d4-0001-4000-8000-000000000002","sender_id":"c1b2c3d4-0001-4000-8000-000000000010","receiver_id":"c1b2c3d4-0001-4000-8000-000000000001","booking_id":"h1b2c3d4-0001-4000-8000-000000000001","content":"Baik Pak, saya sudah ambil kuncinya. Mulai kerja sekarang ya.","is_read":true,"created_at":"2026-04-01T10:45:00Z"},
  {"id":"l1b2c3d4-0001-4000-8000-000000000003","sender_id":"c1b2c3d4-0001-4000-8000-000000000002","receiver_id":"c1b2c3d4-0001-4000-8000-000000000013","booking_id":"h1b2c3d4-0001-4000-8000-000000000003","content":"Hi Ketut, untuk besok ada 3 couples spa package. Bisa mulai dari jam 10 pagi?","is_read":true,"created_at":"2026-03-29T09:30:00Z"},
  {"id":"l1b2c3d4-0001-4000-8000-000000000004","sender_id":"c1b2c3d4-0001-4000-8000-000000000013","receiver_id":"c1b2c3d4-0001-4000-8000-000000000002","booking_id":"h1b2c3d4-0001-4000-8000-000000000003","content":"Bisa Bu, saya siap dari jam 10. Terima kasih!","is_read":true,"created_at":"2026-03-29T10:00:00Z"},
  {"id":"l1b2c3d4-0001-4000-8000-000000000005","sender_id":"c1b2c3d4-0001-4000-8000-000000000003","receiver_id":"c1b2c3d4-0001-4000-8000-000000000017","booking_id":"h1b2c3d4-0001-4000-8000-000000000010","content":"Made, party mulai jam 4 sore ya. Decorations sudah di storage room. Bisa datang jam 2 untuk setup?","is_read":true,"created_at":"2026-04-04T22:30:00Z"},
  {"id":"l1b2c3d4-0001-4000-8000-000000000006","sender_id":"c1b2c3d4-0001-4000-8000-000000000017","receiver_id":"c1b2c3d4-0001-4000-8000-000000000003","booking_id":"h1b2c3d4-0001-4000-8000-000000000010","content":"Siap Pak, saya datang jam 2. Bawa sound system juga ya?","is_read":false,"created_at":"2026-04-04T23:00:00Z"},
  {"id":"l1b2c3d4-0001-4000-8000-000000000007","sender_id":"c1b2c3d4-0001-4000-8000-000000000001","receiver_id":"c1b2c3d4-0001-4000-8000-000000000014","booking_id":"h1b2c3d4-0001-4000-8000-000000000009","content":"Gede, shift malam ini jam 11pm sampai 7am. Check-in 3 rooms expected.","is_read":true,"created_at":"2026-04-04T20:30:00Z"},
  {"id":"l1b2c3d4-0001-4000-8000-000000000008","sender_id":"c1b2c3d4-0001-4000-8000-000000000020","receiver_id":"c1b2c3d4-0001-4000-8000-000000000004","booking_id":"h1b2c3d4-0001-4000-8000-000000000005","content":"Terima kasih sudah accept Pak. Tur dimulai jam 9 pagi dari lobby resort.","is_read":true,"created_at":"2026-03-27T09:30:00Z"}
]'

# STEP 16: NOTIFICATIONS
echo "📋 Notifications..."
insert "notifications" '[
  {"id":"m1b2c3d4-0001-4000-8000-000000000001","user_id":"c1b2c3d4-0001-4000-8000-000000000010","content":"Booking baru! Suite Room Turnover di The Mulia Bali. Klik untuk detail.","is_read":true,"created_at":"2026-04-01T10:00:00Z"},
  {"id":"m1b2c3d4-0001-4000-8000-000000000002","user_id":"c1b2c3d4-0001-4000-8000-000000000010","content":"Pembayaran Rp 250.000 sudah diterima untuk booking Suite Room Turnover.","is_read":true,"created_at":"2026-04-03T12:00:00Z"},
  {"id":"m1b2c3d4-0001-4000-8000-000000000003","user_id":"c1b2c3d4-0001-4000-8000-000000000001","content":"Wayan Kerta menyelesaikan pekerjaan Suite Room Turnover. Berikan review!","is_read":true,"created_at":"2026-04-03T12:00:00Z"},
  {"id":"m1b2c3d4-0001-4000-8000-000000000004","user_id":"c1b2c3d4-0001-4000-8000-000000000019","content":"Booking baru! F&B Service - Sunday Brunch di Potato Head Beach Club.","is_read":true,"created_at":"2026-04-04T18:00:00Z"},
  {"id":"m1b2c3d4-0001-4000-8000-000000000005","user_id":"c1b2c3d4-0001-4000-8000-000000000013","content":"Booking baru! Spa Couples Package di The Mulia Bali. 6 April 2026.","is_read":false,"created_at":"2026-04-05T06:00:00Z"},
  {"id":"m1b2c3d4-0001-4000-8000-000000000006","user_id":"c1b2c3d4-0001-4000-8000-000000000017","content":"Pesan baru dari Potato Head Beach Club tentang event setup.","is_read":false,"created_at":"2026-04-04T23:00:00Z"},
  {"id":"m1b2c3d4-0001-4000-8000-000000000007","user_id":"c1b2c3d4-0001-4000-8000-000000000014","content":"Shift malam di The Mulia Bali dimulai jam 11pm. Jangan lupa!","is_read":false,"created_at":"2026-04-05T07:00:00Z"},
  {"id":"m1b2c3d4-0001-4000-8000-000000000008","user_id":"c1b2c3d4-0001-4000-8000-000000000003","content":"Wallet top-up berhasil! Rp 2.000.000 telah ditambahkan.","is_read":true,"created_at":"2026-03-25T09:00:00Z"},
  {"id":"m1b2c3d4-0001-4000-8000-000000000009","user_id":"c1b2c3d4-0001-4000-8000-000000000012","content":"Booking cancelled: Margarita Night di Motel Mexicola. Dana dikembalikan.","is_read":true,"created_at":"2026-04-02T16:00:00Z"}
]'

# STEP 17: TRANSACTIONS
echo "📋 Transactions..."
insert "transactions" '[
  {"id":"n1b2c3d4-0001-4000-8000-000000000001","booking_id":"h1b2c3d4-0001-4000-8000-000000000001","amount":250000,"type":"payment","status":"success","provider_transaction_id":"xnd_pay_001","created_at":"2026-04-03T12:00:00Z"},
  {"id":"n1b2c3d4-0001-4000-8000-000000000002","booking_id":"h1b2c3d4-0001-4000-8000-000000000002","amount":300000,"type":"payment","status":"success","provider_transaction_id":"xnd_pay_002","created_at":"2026-04-02T22:00:00Z"},
  {"id":"n1b2c3d4-0001-4000-8000-000000000003","booking_id":"h1b2c3d4-0001-4000-8000-000000000003","amount":500000,"type":"payment","status":"success","provider_transaction_id":"xnd_pay_003","created_at":"2026-04-01T18:00:00Z"},
  {"id":"n1b2c3d4-0001-4000-8000-000000000004","booking_id":"h1b2c3d4-0001-4000-8000-000000000011","amount":275000,"type":"refund","status":"success","provider_transaction_id":"xnd_ref_001","created_at":"2026-04-02T16:00:00Z"}
]'

echo ""
echo "============================================"
echo "🎉 SEED COMPLETE!"
echo "============================================"
echo ""
echo "Test accounts (public.users seeded):"
echo "  business@test.com  → The Mulia Bali"
echo "  business2@test.com → AYANA Resort Bali"
echo "  business3@test.com → Potato Head Beach Club"
echo "  business4@test.com → Swept Away Resort"
echo "  business5@test.com → Motel Mexicola"
echo "  worker@test.com    → Wayan Kerta (Housekeeping)"
echo "  worker2@test.com   → Made Surya (Kitchen)"
echo "  worker3@test.com   → Komang Adi (Bartender)"
echo "  worker4@test.com   → Ketut Rai (Spa Therapist)"
echo "  worker5@test.com   → Gede Wibawa (Front Desk)"
echo "  admin@test.com     → Admin DWH"
echo ""
echo "⚠️  NOTE: Auth users need to be created via Supabase Auth"
echo "     for login to work. Run the auth setup script next."
