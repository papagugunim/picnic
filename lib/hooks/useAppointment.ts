'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PurchaseAppointment, CreateAppointmentParams } from '@/types/purchase'

/**
 * 구매약속 관리 훅
 */
export function useAppointment(roomId: string) {
  const [appointment, setAppointment] = useState<PurchaseAppointment | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 활성 약속 조회
  useEffect(() => {
    if (!roomId) return

    const supabase = createClient()

    async function fetchAppointment() {
      try {
        const { data, error } = await supabase
          .from('purchase_appointments')
          .select('*')
          .eq('room_id', roomId)
          .in('status', ['proposed', 'confirmed'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error) {
          console.error('Appointment fetch error:', error)
          setError('약속 정보를 불러오는데 실패했습니다')
          return
        }

        setAppointment(data)
      } catch (err) {
        console.error('Fetch error:', err)
        setError('약속 정보를 불러오는데 실패했습니다')
      } finally {
        setIsLoading(false)
      }
    }

    fetchAppointment()

    // Realtime 구독
    const channel = supabase
      .channel(`appointments:${roomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'purchase_appointments',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        console.log('Appointment change:', payload)

        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const newAppointment = payload.new as PurchaseAppointment
          // 활성 약속만 표시
          if (newAppointment.status === 'proposed' || newAppointment.status === 'confirmed') {
            setAppointment(newAppointment)
          } else {
            setAppointment(null)
          }
        } else if (payload.eventType === 'DELETE') {
          setAppointment(null)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId])

  // 약속 제안
  async function proposeAppointment(params: CreateAppointmentParams): Promise<string> {
    const supabase = createClient()

    try {
      const { data, error } = await supabase.rpc('create_purchase_appointment', {
        p_room_id: params.room_id,
        p_post_id: params.post_id,
        p_appointment_date: params.appointment_date,
        p_location: params.location,
        p_memo: params.memo || null,
        p_proposer_id: params.proposer_id,
        p_responder_id: params.responder_id
      })

      if (error) {
        console.error('Create appointment error:', error)
        throw new Error('약속 제안 실패')
      }

      return data
    } catch (err) {
      console.error('Propose appointment error:', err)
      throw err
    }
  }

  // 약속 응답 (승인/거부)
  async function respondToAppointment(appointmentId: string, status: 'confirmed' | 'cancelled'): Promise<boolean> {
    const supabase = createClient()

    try {
      const { data, error } = await supabase.rpc('respond_to_appointment', {
        p_appointment_id: appointmentId,
        p_status: status
      })

      if (error) {
        console.error('Respond to appointment error:', error)
        throw new Error('약속 응답 실패')
      }

      if (!data) {
        throw new Error('약속을 찾을 수 없습니다')
      }

      return data
    } catch (err) {
      console.error('Respond error:', err)
      throw err
    }
  }

  return {
    appointment,
    isLoading,
    error,
    proposeAppointment,
    respondToAppointment
  }
}
