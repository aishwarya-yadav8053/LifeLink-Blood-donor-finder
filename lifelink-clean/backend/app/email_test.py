"""Optional SMTP connection test. Run explicitly; never emails demo donors or sends medical data."""
import argparse
import smtplib
import ssl
from email.message import EmailMessage
from .config import settings

def main():
    p=argparse.ArgumentParser(description='Send one SMTP test to an address you control')
    p.add_argument('--to',required=True);p.add_argument('--confirm-send',action='store_true');args=p.parse_args()
    if not args.confirm_send:p.error('Use --confirm-send to explicitly send the test email')
    if '@' not in args.to or args.to.endswith(('.local','.invalid','.example')):p.error('Use an address you control, not a fictional demo address')
    if not all([settings.smtp_host,settings.smtp_username,settings.smtp_password,settings.smtp_from]):p.error('Configure SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD and SMTP_FROM in backend/.env')
    msg=EmailMessage();msg['Subject']='LifeLink SMTP connection test';msg['From']=settings.smtp_from;msg['To']=args.to
    msg.set_content('Your LifeLink SMTP test succeeded. This is a connection test only; no patient or donor data was sent.')
    try:
        if settings.smtp_port==465:
            conn=smtplib.SMTP_SSL(settings.smtp_host,settings.smtp_port,context=ssl.create_default_context(),timeout=15)
        else:
            conn=smtplib.SMTP(settings.smtp_host,settings.smtp_port,timeout=15);conn.starttls(context=ssl.create_default_context())
        with conn:
            conn.login(settings.smtp_username,settings.smtp_password);conn.send_message(msg)
    except (smtplib.SMTPException,OSError):
        raise SystemExit('SMTP test failed. Check host, port, credentials, verified sender and provider restrictions. No secret values were logged.')
    print('Test email submitted to your configured provider. Check the destination inbox/spam folder.')

if __name__=='__main__':main()
