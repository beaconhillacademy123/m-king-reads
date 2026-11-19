import SplashSkip from './SplashSkip';

/**
 * Opening screen shown once per visit: "M King Reads — a product of PROMISEVISUALS".
 * Rendered on the server so it appears instantly; CSS animates it away on its own.
 */
export default function BrandSplash() {
  return (
    <>
      <div id="pvSplash" className="pvSplash" aria-hidden="true">
        <div className="pvSplashGlow" />
        <svg className="pvCrown" width="92" height="92" viewBox="0 0 64 64">
          <defs>
            <linearGradient id="pvGold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fbe3a4" /><stop offset=".5" stopColor="#e2b65c" /><stop offset="1" stopColor="#b9801f" />
            </linearGradient>
          </defs>
          <path d="M14 24l9 7 9-13 9 13 9-7-4 18H18z" fill="url(#pvGold)" />
          <path d="M17 46h30c0 0-4 4-15 4s-15-4-15-4z" fill="url(#pvGold)" opacity=".85" />
        </svg>
        <div className="pvWord">M King <b>Reads</b></div>
        <span className="pvRule" />
        <div className="pvBy">
          <small>a product of</small>
          <strong>PROMISEVISUALS</strong>
        </div>
        <div className="pvFlag"><span className="ng" /> Made in Nigeria</div>
      </div>
      <script
        dangerouslySetInnerHTML={{
          __html: "try{if(sessionStorage.getItem('pv-splash')){document.documentElement.setAttribute('data-pv-seen','1')}else{sessionStorage.setItem('pv-splash','1')}}catch(e){}",
        }}
      />
      <SplashSkip />
    </>
  );
}
