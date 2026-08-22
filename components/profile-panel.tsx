'use client'

import { useEffect, useState } from 'react'

type Profile = Record<string, string | null> & { name: string; email: string; loginId: string; role: string }
const fields = ['phone', 'address', 'profilePictureUrl', 'personalEmail', 'gender', 'maritalStatus', 'about', 'skills', 'jobLove', 'certifications', 'interests']
const longFields = ['address', 'about', 'skills', 'jobLove', 'certifications', 'interests']

export default function ProfilePanel({ admin }: { admin: boolean }) {
  const [profile, setProfile] = useState<Profile | null>(null); const [message, setMessage] = useState('')
  useEffect(() => { fetch('/api/profile').then((response) => response.json()).then((result) => setProfile(result.profile)) }, [])
  if (!profile) return <section className="mt-8 text-muted-foreground">Loading profile...</section>
  const currentProfile = profile
  async function save(event: React.FormEvent) { event.preventDefault(); const body = Object.fromEntries(fields.map((field) => [field, currentProfile[field] || ''])); const response = await fetch('/api/profile', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); setMessage(response.ok ? 'Profile saved.' : 'Unable to save profile.') }
  return <form onSubmit={save} className="mt-8 max-w-3xl rounded-2xl border bg-card p-6 shadow-sm"><h2 className="text-xl font-semibold">My Profile</h2><p className="mt-1 text-sm text-muted-foreground">Login ID: {currentProfile.loginId} · {currentProfile.email}</p><div className="mt-6 grid gap-4 sm:grid-cols-2">{fields.map((field) => <label key={field} className={longFields.includes(field) ? 'sm:col-span-2' : ''}><span className="text-xs capitalize text-muted-foreground">{field.replace(/([A-Z])/g, ' $1')}</span>{longFields.includes(field) ? <textarea value={currentProfile[field] || ''} disabled={!admin && field !== 'address'} onChange={(event) => setProfile({ ...currentProfile, [field]: event.target.value })} className="mt-1 min-h-16 w-full rounded-lg border bg-background p-3 text-sm disabled:opacity-60" /> : <input value={currentProfile[field] || ''} disabled={!admin && !['phone', 'profilePictureUrl'].includes(field)} onChange={(event) => setProfile({ ...currentProfile, [field]: event.target.value })} className="mt-1 h-10 w-full rounded-lg border bg-background px-3 text-sm disabled:opacity-60" />}</label>)}</div><div className="mt-5 flex items-center justify-between"><span className="text-sm text-emerald-600">{message}</span><button className="rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground">Save profile</button></div></form>
}