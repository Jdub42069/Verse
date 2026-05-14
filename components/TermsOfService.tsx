import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';

interface TermsOfServiceProps {
  onClose?: () => void;
  showCloseButton?: boolean;
}

export function TermsOfService({ onClose, showCloseButton = true }: TermsOfServiceProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Terms of Service</Text>
        {showCloseButton && onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
        <Text style={styles.effectiveDate}>Effective Date: March 15, 2026</Text>

        <Text style={styles.paragraph}>
          Welcome to our dating application. These Terms of Service constitute a binding legal agreement between you and our company. Please read these Terms carefully before using our Service.
        </Text>

        <Text style={styles.sectionTitle}>1. ACCEPTANCE OF TERMS</Text>
        <Text style={styles.paragraph}>
          By creating an account, accessing, or using our App, you acknowledge that you have read, understood, and agree to be bound by these Terms, our Privacy Policy, and our Community Guidelines.
        </Text>

        <Text style={styles.sectionTitle}>2. ELIGIBILITY AND AGE REQUIREMENTS</Text>
        <Text style={styles.subsectionTitle}>2.1 Minimum Age Requirement</Text>
        <Text style={styles.paragraph}>
          You must be at least 18 years of age or the age of majority in your jurisdiction (whichever is greater) to create an account or use our Service. <Text style={styles.bold}>THE SERVICE IS STRICTLY FOR ADULTS ONLY.</Text>
        </Text>

        <Text style={styles.subsectionTitle}>2.2 Age Verification</Text>
        <Text style={styles.paragraph}>
          We actively monitor for underage use and reserve the right to:
        </Text>
        <Text style={styles.bulletPoint}>• Terminate, suspend, or restrict any account suspected of underage use</Text>
        <Text style={styles.bulletPoint}>• Require age verification at any time, including government-issued ID verification</Text>
        <Text style={styles.bulletPoint}>• Permanently ban users found to be under 18 years of age</Text>
        <Text style={styles.bulletPoint}>• Report suspected underage users to appropriate authorities</Text>

        <Text style={styles.subsectionTitle}>2.3 Zero Tolerance for Minors</Text>
        <Text style={styles.warningText}>
          WE HAVE A ZERO-TOLERANCE POLICY FOR UNDERAGE USERS. Any user who misrepresents their age, attempts to contact minors, or shares content involving minors will be immediately and permanently banned, and we will cooperate fully with law enforcement authorities.
        </Text>

        <Text style={styles.sectionTitle}>3. PROHIBITED CONTENT AND CONDUCT</Text>
        <Text style={styles.subsectionTitle}>3.1 Illegal Content Prohibition</Text>
        <Text style={styles.warningText}>
          NO ILLEGAL CONTENT OR ACTIVITIES ARE PERMITTED ON OUR SERVICE, EVER. This includes, but is not limited to:
        </Text>
        <Text style={styles.bulletPoint}>• Child sexual abuse material (CSAM) or any content involving minors</Text>
        <Text style={styles.bulletPoint}>• Human trafficking or sexual exploitation</Text>
        <Text style={styles.bulletPoint}>• Content violating intellectual property or privacy rights</Text>
        <Text style={styles.bulletPoint}>• Illegal drugs, weapons, or controlled substances</Text>
        <Text style={styles.bulletPoint}>• Fraud, scams, or theft</Text>
        <Text style={styles.bulletPoint}>• Violence, terrorism, or extremism</Text>
        <Text style={styles.bulletPoint}>• Revenge pornography or non-consensual intimate images</Text>

        <Text style={styles.subsectionTitle}>3.2 Harmful and Inappropriate Content</Text>
        <Text style={styles.paragraph}>Users may not upload, post, transmit, or share content that:</Text>
        <Text style={styles.bulletPoint}>• Is sexually explicit, pornographic, or obscene</Text>
        <Text style={styles.bulletPoint}>• Depicts or promotes violence, self-harm, or suicide</Text>
        <Text style={styles.bulletPoint}>• Is defamatory, harassing, threatening, or abusive</Text>
        <Text style={styles.bulletPoint}>• Promotes hate speech or discrimination</Text>
        <Text style={styles.bulletPoint}>• Contains spam or commercial solicitations</Text>
        <Text style={styles.bulletPoint}>• Impersonates another person or entity</Text>
        <Text style={styles.bulletPoint}>• Is harmful to minors in any way</Text>

        <Text style={styles.subsectionTitle}>3.3 Prohibited Conduct</Text>
        <Text style={styles.paragraph}>Users may not:</Text>
        <Text style={styles.bulletPoint}>• Use the Service for any unlawful purpose</Text>
        <Text style={styles.bulletPoint}>• Harass, stalk, threaten, or harm other users</Text>
        <Text style={styles.bulletPoint}>• Engage in sexual harassment or unwanted sexual advances</Text>
        <Text style={styles.bulletPoint}>• Solicit money or personal information from other users</Text>
        <Text style={styles.bulletPoint}>• Promote escort services, prostitution, or sexual services for compensation</Text>
        <Text style={styles.bulletPoint}>• Share non-consensual intimate images</Text>
        <Text style={styles.bulletPoint}>• Create multiple accounts or evade bans</Text>
        <Text style={styles.bulletPoint}>• Misrepresent identity, age, or personal information</Text>

        <Text style={styles.sectionTitle}>4. ACCOUNT SECURITY</Text>
        <Text style={styles.paragraph}>
          You are responsible for maintaining the confidentiality of your account credentials and all activities that occur under your account. You must notify us immediately of any unauthorized use.
        </Text>

        <Text style={styles.sectionTitle}>5. CRIMINAL BACKGROUND SCREENING</Text>
        <Text style={styles.paragraph}>
          We may investigate whether a member has a criminal history and may block users convicted of serious offenses including sex offenses, human trafficking, stalking, domestic violence, or violent crimes.
        </Text>
        <Text style={styles.warningText}>
          IMPORTANT: Criminal background checks are NOT conducted on all members. Background checks are not foolproof and may create a false sense of security. YOU USE THE SERVICE AT YOUR OWN RISK.
        </Text>

        <Text style={styles.sectionTitle}>6. USER CONDUCT AND SAFETY</Text>
        <Text style={styles.paragraph}>
          All interactions must be consensual and respectful. We may take action against your account based on your conduct on or off the Service, including offline interactions with other users.
        </Text>

        <Text style={styles.sectionTitle}>7. ACCOUNT TERMINATION</Text>
        <Text style={styles.paragraph}>
          We reserve the right to suspend or terminate your account immediately without notice for violations of these Terms, illegal activity, harassment, or any reason we deem necessary to protect our users or Service.
        </Text>

        <Text style={styles.sectionTitle}>8. DISCLAIMER OF WARRANTIES</Text>
        <Text style={styles.warningText}>
          THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. We do not conduct comprehensive background checks on users. We do not verify the accuracy of user-provided information. Your use of the Service is at your own risk.
        </Text>

        <Text style={styles.sectionTitle}>9. LIMITATION OF LIABILITY</Text>
        <Text style={styles.paragraph}>
          We shall not be liable for any indirect, incidental, special, or consequential damages, including personal injury, emotional distress, or damages arising from user interactions.
        </Text>
        <Text style={styles.warningText}>
          YOU ASSUME ALL RISK WHEN INTERACTING WITH OTHER USERS. We are not responsible for the conduct of any user. You should exercise caution when meeting users in person.
        </Text>

        <Text style={styles.sectionTitle}>10. DISPUTE RESOLUTION</Text>
        <Text style={styles.paragraph}>
          All disputes will be resolved through binding arbitration, not in court. You waive any right to participate in a class action or class-wide arbitration.
        </Text>

        <Text style={styles.sectionTitle}>11. COMPLIANCE WITH LAWS</Text>
        <Text style={styles.paragraph}>
          We cooperate with law enforcement and may report child sexual abuse material, human trafficking, threats of violence, or other illegal activity as required by law.
        </Text>

        <Text style={styles.sectionTitle}>12. SAFETY RESOURCES</Text>
        <Text style={styles.paragraph}>If you or someone you know needs help:</Text>
        <Text style={styles.bulletPoint}>• National Sexual Assault Hotline: 1-800-656-HOPE (4673)</Text>
        <Text style={styles.bulletPoint}>• National Domestic Violence Hotline: 1-800-799-7233</Text>
        <Text style={styles.bulletPoint}>• National Suicide Prevention Lifeline: 988</Text>
        <Text style={styles.bulletPoint}>• Emergency Services: 911</Text>

        <Text style={styles.acknowledgment}>
          BY CREATING AN ACCOUNT OR USING OUR SERVICE, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS OF SERVICE.
        </Text>

        <Text style={styles.acknowledgment}>
          YOU SPECIFICALLY ACKNOWLEDGE AND AGREE TO:
        </Text>
        <Text style={styles.bulletPoint}>• The minimum age requirement of 18 years</Text>
        <Text style={styles.bulletPoint}>• The prohibition on illegal content and activities</Text>
        <Text style={styles.bulletPoint}>• The limitation of liability and disclaimer of warranties</Text>
        <Text style={styles.bulletPoint}>• Your responsibility for interactions with other users</Text>
        <Text style={styles.bulletPoint}>• Our right to terminate your account at any time</Text>
        <Text style={styles.bulletPoint}>• The acknowledgment that we do not conduct comprehensive background checks</Text>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            For the complete Terms of Service, please visit our website or contact support@ourapp.com
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  effectiveDate: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 24,
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D1D5DB',
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 22,
    marginBottom: 12,
  },
  bulletPoint: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 22,
    marginBottom: 6,
    paddingLeft: 8,
  },
  bold: {
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  warningText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 12,
    backgroundColor: '#7F1D1D',
    padding: 12,
    borderRadius: 8,
  },
  acknowledgment: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
    lineHeight: 22,
    marginTop: 24,
    marginBottom: 12,
    backgroundColor: '#374151',
    padding: 12,
    borderRadius: 8,
  },
  footer: {
    marginTop: 32,
    marginBottom: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  footerText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
});
