import { focusFirstError } from './formFocus'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, Eye, EyeOff, Sprout, Wheat, ShieldCheck } from 'lucide-react'
import { demoUsers, login, register, validateRegistration } from './auth'
import type { Registration, User } from './auth'

export default function AuthPage({ mode, onLogin }: { mode: 'login' | 'register'; onLogin: (user: User) => void }) {
  const isRegister = mode === 'register'
  const [form, setForm] = useState<Registration>({ name: '', company: '', email: '', password: '', confirm: '', role: 'buyer' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const update = (key: keyof Registration, value: string) => { setForm(f => ({ ...f, [key]: value })); setErrors(e => ({ ...e, [key]: '' })); setMessage(''); setSuccess('') }
  function submit(event: FormEvent) {
    event.preventDefault(); setMessage(''); setSuccess('')
    const validation = isRegister ? validateRegistration(form) : {
      ...(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) ? { email: 'Enter a valid email address.' } : {}),
      ...(!form.password ? { password: 'Enter your password.' } : {}),
    }
    setErrors(validation)
    if (Object.keys(validation).length) { focusFirstError(validation); return }
    try {
      if (isRegister) register(localStorage, form)
      onLogin(login(localStorage, form.email, form.password))
    } catch (error) { setMessage(error instanceof Error && !/storage|quota|access/i.test(error.message) ? error.message : 'Browser storage is unavailable. Enable local storage to use demo authentication.') }
  }
  return <div className="auth-layout"><aside className="auth-story"><a className="brand" href="#/login"><span className="brand-mark"><Sprout size={25}/></span><span>agro<span className="brand-light">procure</span><small>AI PROCUREMENT PLATFORM</small></span></a><div className="auth-story-content"><span className="banner-kicker">GROW BETTER, TOGETHER</span><h1>Good connections.<br/>Great possibilities.</h1><p>Your next season of smarter agricultural procurement starts with a single connection.</p><Wheat className="auth-wheat" strokeWidth={.7}/><div className="auth-trust"><ShieldCheck size={19}/>One workspace. A stronger supply chain.</div></div><span className="auth-story-footer">Built for a better way to source.</span></aside><main className="auth-main"><div className="auth-card"><span className="eyebrow">AI AGROPROCUREMENT</span><h1>{isRegister ? 'Let’s grow your network.' : 'Welcome back.'}</h1><p className="auth-subtitle">{isRegister ? 'Create your account and find your next opportunity.' : 'Sign in to your procurement workspace.'}</p><div className="auth-tabs"><a className={!isRegister ? 'selected' : ''} href="#/login">Login</a><a className={isRegister ? 'selected' : ''} href="#/register">Register</a></div>
    <form onSubmit={submit} noValidate>
      {isRegister && <><fieldset className="role-picker"><legend>I’m joining as a</legend>{(['buyer', 'supplier'] as const).map(role => <label key={role} className={form.role === role ? 'selected' : ''}><input type="radio" name="role" value={role} checked={form.role === role} onChange={() => update('role', role)}/><span><strong>{role === 'buyer' ? 'Buyer' : 'Supplier'}</strong><small>{role === 'buyer' ? 'Source agricultural products' : 'Connect with buyers'}</small></span></label>)}</fieldset>{errors.role && <p className="field-error">{errors.role}</p>}</>}
      {(isRegister ? ['name', 'company', 'email', 'password', 'confirm'] as const : ['email', 'password'] as const).map(key => <div className="form-field" key={key}><label htmlFor={key}>{{ name: 'Full name', company: 'Company name', email: 'Email address', password: 'Password', confirm: 'Confirm password' }[key]}</label><div className="input-wrap"><input id={key} name={key} type={key === 'email' ? 'email' : key === 'password' || key === 'confirm' ? showPassword ? 'text' : 'password' : 'text'} autoComplete={key === 'password' ? isRegister ? 'new-password' : 'current-password' : key === 'confirm' ? 'new-password' : key === 'name' ? 'name' : key === 'company' ? 'organization' : 'email'} value={form[key]} onInput={e => update(key, e.currentTarget.value)} onChange={e => update(key, e.target.value)} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `${key}-error` : key === 'password' && isRegister ? 'password-hint' : undefined} required maxLength={key === 'password' || key === 'confirm' ? 128 : 150}/>{key === 'password' && <button type="button" className="icon-button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button>}</div>{key === 'password' && isRegister && <small id="password-hint" className="field-hint">At least 8 characters, including a letter and a number.</small>}{errors[key] && <p className="field-error" id={`${key}-error`}>{errors[key]}</p>}</div>)}
      {message && <div role="alert" className="form-alert">{message}</div>}{success && <div role="status" className="form-success">{success}</div>}<button className="auth-submit" type="submit">{isRegister ? 'Create account' : 'Sign in'}<ArrowRight size={17}/></button>
    </form>
    {!isRegister && <div className="demo-accounts"><strong>Take a look around</strong><p>Choose a demo to fill in the credentials, then sign in.</p><div>{demoUsers.map(user => <button key={user.id} type="button" onClick={() => { setForm(f => ({ ...f, email: user.email, password: user.password })); setErrors({}); setMessage(''); setSuccess(`${user.role === 'buyer' ? 'Buyer' : 'Supplier'} demo credentials filled. Select Sign in.`) }}>{user.role === 'buyer' ? 'Buyer demo' : 'Supplier demo'}<ArrowRight size={14}/></button>)}</div><small>Buyer: buyer@agro.demo / Buyer123!<br/>Supplier: supplier@agro.demo / Supplier123!</small></div>}
    <p className="auth-disclaimer">Demo authentication only. Accounts and passwords are stored in this browser. Use a sample password, never a real one.</p></div></main></div>
}
