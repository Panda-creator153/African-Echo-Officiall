import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useContent } from '../context/ContentContext';
import { Send, MessageSquare, Tag, Users, CheckCircle, AlertCircle } from 'lucide-react';
import SEO from '../components/SEO';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

const Contact = () => {
  const { content, loading } = useContent();
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const contactSchema = useMemo(() => {
    if (!content) return null;
    return {
      "@context": "https://schema.org",
      "@type": "ContactPage",
      "mainEntity": {
        "@type": "MusicGroup",
        "name": content.artistName,
        "contactPoint": [
          {
            "@type": "ContactPoint",
            "email": content.contact?.managementEmail || 'mgmt@africanecho.com',
            "contactType": "management"
          },
          {
            "@type": "ContactPoint",
            "email": content.contact?.pressEmail || 'press@africanecho.com',
            "contactType": "press"
          }
        ]
      }
    };
  }, [content]);

  if (!content) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim()) {
      setSubmitStatus('error');
      setErrorMessage('Please fill in all fields with valid information.');
      return;
    }

    const emailRegex = /^[^@]+@[^@]+\.[^@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setSubmitStatus('error');
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(false);
    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    const messageId = `msg-${Date.now()}`;
    const messageDocRef = doc(db, 'contacts', messageId);

    try {
      await setDoc(messageDocRef, {
        id: messageId,
        name: formData.name.trim(),
        email: formData.email.trim(),
        subject: formData.subject.trim(),
        message: formData.message.trim(),
        createdAt: serverTimestamp()
      });
      setSubmitStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err: any) {
      console.error('Error submitting contact form:', err);
      setSubmitStatus('error');
      setErrorMessage('Failed to send your message. Please try again later.');
      try {
        handleFirestoreError(err, OperationType.WRITE, `contacts/${messageId}`);
      } catch (e2) {
        // Logged helper
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="pt-40 pb-32 px-6">
      <SEO 
        title="Contact & Support" 
        description={`Get in touch with ${content.artistName}'s team for press inquiries, management, and general support.`} 
        schema={contactSchema}
      />
      <div className="max-w-7xl mx-auto">
        <header className="mb-24 text-center">
          <p className="text-[10px] font-bold tracking-[0.4em] text-accent mb-4 uppercase">GET IN TOUCH</p>
          <h1 className="text-6xl md:text-9xl font-display font-bold tracking-tight mb-8">CONTACT</h1>
        </header>

        <div className="grid lg:grid-cols-3 gap-8 mb-24">
          <div className="glass-panel p-10 rounded-[32px] text-center hover:border-accent/30 transition-colors">
            <Tag className="w-8 h-8 text-secondary mx-auto mb-6" />
            <h3 className="text-xl font-bold mb-2">MANAGEMENT</h3>
            <p className="text-secondary text-sm">{content.contact?.managementEmail || 'mgmt@africanecho.com'}</p>
          </div>
          <div className="glass-panel p-10 rounded-[32px] text-center hover:border-accent/30 transition-colors">
            <Users className="w-8 h-8 text-secondary mx-auto mb-6" />
            <h3 className="text-xl font-bold mb-2">PRESS</h3>
            <p className="text-secondary text-sm">{content.contact?.pressEmail || 'press@africanecho.com'}</p>
          </div>
          <div className="glass-panel p-10 rounded-[32px] text-center hover:border-accent/30 transition-colors">
            <MessageSquare className="w-8 h-8 text-secondary mx-auto mb-6" />
            <h3 className="text-xl font-bold mb-2">GENERAL</h3>
            <p className="text-secondary text-sm">{content.contact?.generalEmail || 'hello@africanecho.com'}</p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto glass-panel p-16 rounded-[40px]">
           <form className="space-y-10" onSubmit={handleSubmit}>
              {submitStatus === 'success' && (
                <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 text-green-400 p-5 rounded-2xl">
                  <CheckCircle className="w-5 h-5 shrink-0" />
                  <p className="text-xs font-medium">Thank you! Your message has been sent successfully. We will get back to you soon.</p>
                </div>
              )}

              {submitStatus === 'error' && (
                <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 p-5 rounded-2xl">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-xs font-medium">{errorMessage}</p>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest text-secondary uppercase">FULL NAME</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={isSubmitting}
                  placeholder="Your Name"
                  className="w-full bg-transparent border-b border-white/10 py-4 focus:outline-none focus:border-accent transition-colors text-white placeholder-white/20" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest text-secondary uppercase">EMAIL ADDRESS</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={isSubmitting}
                  placeholder="you@example.com"
                  className="w-full bg-transparent border-b border-white/10 py-4 focus:outline-none focus:border-accent transition-colors text-white placeholder-white/20" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest text-secondary uppercase">SUBJECT</label>
                <input 
                  type="text" 
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  disabled={isSubmitting}
                  placeholder="Inquiry Topic"
                  className="w-full bg-transparent border-b border-white/10 py-4 focus:outline-none focus:border-accent transition-colors text-white placeholder-white/20" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold tracking-widest text-secondary uppercase">YOUR MESSAGE</label>
                <textarea 
                  rows={5} 
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  disabled={isSubmitting}
                  placeholder="How can we help you?"
                  className="w-full bg-transparent border-b border-white/10 py-4 focus:outline-none focus:border-accent transition-colors resize-none text-white placeholder-white/20" 
                />
              </div>

              <button 
                type="submit"
                disabled={isSubmitting}
                className="bg-white text-black font-bold tracking-[0.2em] px-12 py-6 rounded-full hover:bg-accent hover:text-white transition-all flex items-center justify-center group uppercase text-xs disabled:opacity-50"
              >
                {isSubmitting ? 'SENDING...' : 'SEND MESSAGE'} <Send className="ml-3 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
           </form>
        </div>
      </div>
    </div>
  );
};

export default Contact;
