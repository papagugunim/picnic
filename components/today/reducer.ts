import { WeatherData, ExchangeRates, NewsItem, OHLCData, ChartPeriod, ChartType, NewsFormData } from './types'

// UI 상태
export interface UIState {
  showCalculator: boolean
  showChart: boolean
  showNewsModal: boolean
  showNewsForm: boolean
  showAllNews: boolean
}

// 데이터 상태
export interface DataState {
  weather: WeatherData | null
  exchangeRates: ExchangeRates | null
  newsList: NewsItem[]
  chartData: OHLCData[]
  yearlyChartData: {
    rub: OHLCData[]
    usd: OHLCData[]
  }
  selectedNews: NewsItem | null
  editingNews: NewsItem | null
  userCity: string | null
  isAdmin: boolean
}

// 로딩 상태
export interface LoadingState {
  isLoading: boolean
  isRefreshingWeather: boolean
  isRefreshingExchangeRates: boolean
  isLoadingChart: boolean
  isSavingNews: boolean
}

// 입력 상태
export interface InputState {
  rubAmount: string
  krwAmount: string
  lastEdited: 'rub' | 'krw'
  chartType: ChartType
  chartPeriod: ChartPeriod
  currentNewsIndex: number
  newsFormData: NewsFormData
}

// 전체 상태
export interface TodayPageState {
  ui: UIState
  data: DataState
  loading: LoadingState
  input: InputState
  currentDate: Date
  weatherLastUpdated: Date | null
  exchangeRatesLastUpdated: Date | null
}

// 액션 타입
export type TodayPageAction =
  // UI 액션
  | { type: 'TOGGLE_CALCULATOR'; payload: boolean }
  | { type: 'TOGGLE_CHART'; payload: boolean }
  | { type: 'TOGGLE_NEWS_MODAL'; payload: boolean }
  | { type: 'TOGGLE_NEWS_FORM'; payload: boolean }
  | { type: 'TOGGLE_ALL_NEWS'; payload: boolean }
  // 데이터 액션
  | { type: 'SET_WEATHER'; payload: WeatherData | null }
  | { type: 'SET_EXCHANGE_RATES'; payload: ExchangeRates | null }
  | { type: 'SET_NEWS_LIST'; payload: NewsItem[] }
  | { type: 'SET_CHART_DATA'; payload: OHLCData[] }
  | { type: 'SET_YEARLY_CHART_DATA'; payload: { type: ChartType; data: OHLCData[] } }
  | { type: 'SET_SELECTED_NEWS'; payload: NewsItem | null }
  | { type: 'SET_EDITING_NEWS'; payload: NewsItem | null }
  | { type: 'SET_USER_CITY'; payload: string | null }
  | { type: 'SET_IS_ADMIN'; payload: boolean }
  // 로딩 액션
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_REFRESHING_WEATHER'; payload: boolean }
  | { type: 'SET_REFRESHING_EXCHANGE_RATES'; payload: boolean }
  | { type: 'SET_LOADING_CHART'; payload: boolean }
  | { type: 'SET_SAVING_NEWS'; payload: boolean }
  // 입력 액션
  | { type: 'SET_RUB_AMOUNT'; payload: string }
  | { type: 'SET_KRW_AMOUNT'; payload: string }
  | { type: 'SET_LAST_EDITED'; payload: 'rub' | 'krw' }
  | { type: 'SET_CHART_TYPE'; payload: ChartType }
  | { type: 'SET_CHART_PERIOD'; payload: ChartPeriod }
  | { type: 'SET_CURRENT_NEWS_INDEX'; payload: number }
  | { type: 'SET_NEWS_FORM_DATA'; payload: NewsFormData }
  | { type: 'RESET_NEWS_FORM' }
  // 날짜/시간 액션
  | { type: 'SET_CURRENT_DATE'; payload: Date }
  | { type: 'SET_WEATHER_LAST_UPDATED'; payload: Date | null }
  | { type: 'SET_EXCHANGE_RATES_LAST_UPDATED'; payload: Date | null }

// 초기 상태
export const initialState: TodayPageState = {
  ui: {
    showCalculator: false,
    showChart: false,
    showNewsModal: false,
    showNewsForm: false,
    showAllNews: false
  },
  data: {
    weather: null,
    exchangeRates: null,
    newsList: [],
    chartData: [],
    yearlyChartData: { rub: [], usd: [] },
    selectedNews: null,
    editingNews: null,
    userCity: null,
    isAdmin: false
  },
  loading: {
    isLoading: true,
    isRefreshingWeather: false,
    isRefreshingExchangeRates: false,
    isLoadingChart: false,
    isSavingNews: false
  },
  input: {
    rubAmount: '',
    krwAmount: '',
    lastEdited: 'rub',
    chartType: 'rub',
    chartPeriod: 'week',
    currentNewsIndex: 0,
    newsFormData: { title: '', content: '', summary: '' }
  },
  currentDate: new Date(),
  weatherLastUpdated: null,
  exchangeRatesLastUpdated: null
}

// 리듀서
export function todayPageReducer(state: TodayPageState, action: TodayPageAction): TodayPageState {
  switch (action.type) {
    // UI 액션
    case 'TOGGLE_CALCULATOR':
      return { ...state, ui: { ...state.ui, showCalculator: action.payload } }
    case 'TOGGLE_CHART':
      return { ...state, ui: { ...state.ui, showChart: action.payload } }
    case 'TOGGLE_NEWS_MODAL':
      return { ...state, ui: { ...state.ui, showNewsModal: action.payload } }
    case 'TOGGLE_NEWS_FORM':
      return { ...state, ui: { ...state.ui, showNewsForm: action.payload } }
    case 'TOGGLE_ALL_NEWS':
      return { ...state, ui: { ...state.ui, showAllNews: action.payload } }

    // 데이터 액션
    case 'SET_WEATHER':
      return { ...state, data: { ...state.data, weather: action.payload } }
    case 'SET_EXCHANGE_RATES':
      return { ...state, data: { ...state.data, exchangeRates: action.payload } }
    case 'SET_NEWS_LIST':
      return { ...state, data: { ...state.data, newsList: action.payload } }
    case 'SET_CHART_DATA':
      return { ...state, data: { ...state.data, chartData: action.payload } }
    case 'SET_YEARLY_CHART_DATA':
      return {
        ...state,
        data: {
          ...state.data,
          yearlyChartData: {
            ...state.data.yearlyChartData,
            [action.payload.type]: action.payload.data
          }
        }
      }
    case 'SET_SELECTED_NEWS':
      return { ...state, data: { ...state.data, selectedNews: action.payload } }
    case 'SET_EDITING_NEWS':
      return { ...state, data: { ...state.data, editingNews: action.payload } }
    case 'SET_USER_CITY':
      return { ...state, data: { ...state.data, userCity: action.payload } }
    case 'SET_IS_ADMIN':
      return { ...state, data: { ...state.data, isAdmin: action.payload } }

    // 로딩 액션
    case 'SET_LOADING':
      return { ...state, loading: { ...state.loading, isLoading: action.payload } }
    case 'SET_REFRESHING_WEATHER':
      return { ...state, loading: { ...state.loading, isRefreshingWeather: action.payload } }
    case 'SET_REFRESHING_EXCHANGE_RATES':
      return { ...state, loading: { ...state.loading, isRefreshingExchangeRates: action.payload } }
    case 'SET_LOADING_CHART':
      return { ...state, loading: { ...state.loading, isLoadingChart: action.payload } }
    case 'SET_SAVING_NEWS':
      return { ...state, loading: { ...state.loading, isSavingNews: action.payload } }

    // 입력 액션
    case 'SET_RUB_AMOUNT':
      return { ...state, input: { ...state.input, rubAmount: action.payload } }
    case 'SET_KRW_AMOUNT':
      return { ...state, input: { ...state.input, krwAmount: action.payload } }
    case 'SET_LAST_EDITED':
      return { ...state, input: { ...state.input, lastEdited: action.payload } }
    case 'SET_CHART_TYPE':
      return { ...state, input: { ...state.input, chartType: action.payload } }
    case 'SET_CHART_PERIOD':
      return { ...state, input: { ...state.input, chartPeriod: action.payload } }
    case 'SET_CURRENT_NEWS_INDEX':
      return { ...state, input: { ...state.input, currentNewsIndex: action.payload } }
    case 'SET_NEWS_FORM_DATA':
      return { ...state, input: { ...state.input, newsFormData: action.payload } }
    case 'RESET_NEWS_FORM':
      return {
        ...state,
        input: { ...state.input, newsFormData: { title: '', content: '', summary: '' } },
        data: { ...state.data, editingNews: null }
      }

    // 날짜/시간 액션
    case 'SET_CURRENT_DATE':
      return { ...state, currentDate: action.payload }
    case 'SET_WEATHER_LAST_UPDATED':
      return { ...state, weatherLastUpdated: action.payload }
    case 'SET_EXCHANGE_RATES_LAST_UPDATED':
      return { ...state, exchangeRatesLastUpdated: action.payload }

    default:
      return state
  }
}
