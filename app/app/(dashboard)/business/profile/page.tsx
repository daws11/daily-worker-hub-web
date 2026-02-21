"use client"

export default function BusinessProfilePage() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '1rem'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          Dashboard Business - Profile
        </h1>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>
            Kelola profil bisnis Anda untuk menarik lebih banyak pekerja.
          </p>

          <form style={{ maxWidth: '600px' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="businessName" style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                marginBottom: '0.5rem',
                color: '#374151'
              }}>
                Nama Bisnis
              </label>
              <input
                type="text"
                id="businessName"
                name="businessName"
                placeholder="Masukkan nama bisnis Anda"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="industry" style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                marginBottom: '0.5rem',
                color: '#374151'
              }}>
                Industri
              </label>
              <select
                id="industry"
                name="industry"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '1rem',
                  outline: 'none',
                  backgroundColor: 'white',
                  transition: 'border-color 0.2s'
                }}
              >
                <option value="">Pilih industri</option>
                <option value="technology">Teknologi</option>
                <option value="retail">Retail</option>
                <option value="food">Makanan & Minuman</option>
                <option value="services">Jasa</option>
                <option value="manufacturing">Manufaktur</option>
                <option value="other">Lainnya</option>
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="description" style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                marginBottom: '0.5rem',
                color: '#374151'
              }}>
                Deskripsi Bisnis
              </label>
              <textarea
                id="description"
                name="description"
                rows="4"
                placeholder="Jelaskan tentang bisnis Anda..."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '1rem',
                  outline: 'none',
                  resize: 'vertical',
                  transition: 'border-color 0.2s'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="website" style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                marginBottom: '0.5rem',
                color: '#374151'
              }}>
                Website
              </label>
              <input
                type="url"
                id="website"
                name="website"
                placeholder="https://example.com"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="phone" style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                marginBottom: '0.5rem',
                color: '#374151'
              }}>
                Nomor Telepon
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                placeholder="+62 812 3456 7890"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="address" style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                marginBottom: '0.5rem',
                color: '#374151'
              }}>
                Alamat
              </label>
              <textarea
                id="address"
                name="address"
                rows="2"
                placeholder="Masukkan alamat lengkap bisnis Anda..."
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '1rem',
                  outline: 'none',
                  resize: 'vertical',
                  transition: 'border-color 0.2s'
                }}
              />
            </div>

            <div style={{
              display: 'flex',
              gap: '1rem',
              marginTop: '2rem'
            }}>
              <button
                type="submit"
                style={{
                  padding: '0.75rem 2rem',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                Simpan Profil
              </button>
              <button
                type="button"
                style={{
                  padding: '0.75rem 2rem',
                  backgroundColor: 'white',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                Batal
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
