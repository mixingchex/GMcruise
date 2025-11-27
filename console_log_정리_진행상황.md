# console.log 정리 진행 상황

> **작성일**: 2025년 1월 28일  
> **목적**: 프로덕션 로그 정리 및 코드 품질 개선

> 📖 **이 작업이 왜 필요한가요?**  
> 코딩 초보자를 위한 쉽고 구체적인 설명: [`왜_console_log를_정리해야하는가.md`](./왜_console_log를_정리해야하는가.md)

---

## 📊 전체 현황

- **총 파일 수**: 493개
- **총 console 사용**: 1,568개
- **완료 파일**: 280개 ✅
- **진행률**: 약 57%
- **남은 파일**: 약 674개

---

## ✅ 완료된 파일 (6개)

1. ✅ `app/api/admin/admin-panel-admins/batch-delete/route.ts`
   - console.log → logger.log (2개)
   - console.error → logger.error (3개)

2. ✅ `app/api/admin/system/google-drive/route.ts`
   - console.error → logger.error (3개)

3. ✅ `app/api/admin/affiliate/leads/[leadId]/route.ts`
   - console.error → logger.error (4개)

4. ✅ `app/api/admin/cruise-photos/route.ts`
   - console.log → logger.log (4개)
   - console.error → logger.error (7개)
   - console.warn → logger.warn (2개)

5. ✅ `app/api/admin/affiliate/settlements/excel/route.ts`
   - console.error → logger.error (1개)

6. ✅ `app/api/exchange-rate/route.ts`
   - console.error → logger.error (1개)

7. ✅ `app/api/auth/login/route.ts`
   - console.error → logger.error (35개)
   - console.warn → logger.warn (11개)
   - **총 46개 변경 완료** (가장 많은 console 사용 파일)

8. ✅ `app/api/payment/callback/route.ts`
   - console.error → logger.error (6개)
   - console.warn → logger.warn (2개)

9. ✅ `app/api/payment/notify/route.ts`
   - console.warn → logger.warn (1개)

10. ✅ `app/api/payment/request/route.ts`
   - console.error → logger.error (1개)

11. ✅ `app/api/payment/webhook/route.ts`
   - console.error → logger.error (2개)

12. ✅ `app/api/payment/virtual-account/route.ts`
   - console.error → logger.error (3개)

13. ✅ `lib/session.ts`
   - console.error → logger.error (1개)

14. ✅ `lib/google-drive.ts`
   - console.log → logger.log (1개)
   - console.error → logger.error (24개)

15. ✅ `lib/affiliate/document-drive-sync.ts`
   - console.log → logger.log (2개)
   - console.error → logger.error (5개)
   - console.warn → logger.warn (3개)

16. ✅ `lib/google-sheets.ts`
   - console.log → logger.log (2개)
   - console.error → logger.error (6개)
   - console.warn → logger.warn (1개)

17. ✅ `lib/google-drive-affiliate-info.ts`
   - console.error → logger.error (2개)

18. ✅ `app/api/admin/products/[productCode]/route.ts`
   - console.log → logger.log (11개)
   - console.error → logger.error (9개)

19. ✅ `app/api/admin/auth-check/route.ts`
   - console.error → logger.error (2개)

20. ✅ `app/api/admin/cruise-guide-users/route.ts`
   - console.error → logger.error (2개)

21. ✅ `app/api/admin/settings/update/route.ts`
   - console.error → logger.error (1개)

22. ✅ `app/api/admin/affiliate/my-messages/route.ts`
   - console.error → logger.error (3개)

23. ✅ `app/api/admin/affiliate/messages/recipients/route.ts`
   - console.error → logger.error (2개)

24. ✅ `app/api/admin/affiliate/messages/send/route.ts`
   - console.error → logger.error (5개)

25. ✅ `app/api/admin/affiliate/messages/[id]/route.ts`
   - console.error → logger.error (2개)

26. ✅ `app/api/admin/messages/[id]/readers/route.ts`
   - console.error → logger.error (2개)

27. ✅ `app/api/admin/purchase-customers/[userId]/trip-info/route.ts`
   - console.error → logger.error (1개)

28. ✅ `app/api/admin/customers/create-genie/route.ts`
   - console.error → logger.error (1개)

29. ✅ `lib/google-drive-product-backup.ts`
   - console.log → logger.log (1개)
   - console.error → logger.error (2개)
   - console.warn → logger.warn (6개)

30. ✅ `lib/scheduler/payslipSender.ts`
   - console.log → logger.log (10개)
   - console.error → logger.error (3개)

31. ✅ `lib/affiliate/auto-setup.ts`
   - console.log → logger.log (5개)
   - console.error → logger.error (1개)

32. ✅ `lib/notifications/certificateNotifications.ts`
   - console.log → logger.log (3개)
   - console.error → logger.error (2개)

33. ✅ `lib/scheduler/databaseBackup.ts`
   - console.log → logger.log (8개)
   - console.error → logger.error (5개)

34. ✅ `lib/scheduler/spreadsheetBackup.ts`
   - console.log → logger.log (8개)
   - console.error → logger.error (7개)

35. ✅ `lib/scheduler/proactiveEngine.ts`
   - console.log → logger.log (14개)
   - console.error → logger.error (5개)

36. ✅ `lib/scheduler/lifecycleManager.ts`
   - console.log → logger.log (19개)
   - console.error → logger.error (2개)
   - console.debug → logger.debug (1개)

37. ✅ `lib/scheduler/tripStatusUpdater.ts`
   - console.log → logger.log (8개)
   - console.error → logger.error (2개)

38. ✅ `lib/scheduler/contractTerminationHandler.ts`
   - console.log → logger.log (15개)
   - console.error → logger.error (5개)

39. ✅ `lib/scheduler/scheduledMessageSender.ts`
   - console.log → logger.log (15개)
   - console.error → logger.error (3개)

40. ✅ `lib/scheduler/affiliateLinkCleanup.ts`
   - console.log → logger.log (14개)
   - console.error → logger.error (3개)

41. ✅ `lib/scheduler/rePurchaseTrigger.ts`
   - console.log → logger.log (15개)
   - console.error → logger.error (3개)

42. ✅ `lib/gemini.ts`
   - console.log → logger.log (14개)
   - console.error → logger.error (7개)
   - console.warn → logger.warn (2개)

43. ✅ `lib/weather.ts`
   - console.warn → logger.warn (1개)
   - console.error → logger.error (3개)

44. ✅ `lib/customer-journey.ts`
   - console.log → logger.log (1개)
   - console.error → logger.error (1개)

45. ✅ `lib/performance-monitor.ts`
   - console.warn → logger.warn (1개)
   - console.log → logger.log (1개)

46. ✅ `lib/photos-search.ts`
   - console.warn → logger.warn (2개)
   - console.error → logger.error (1개)
   - console.log → logger.log (1개)

47. ✅ `lib/cruise-images.ts`
   - console.warn → logger.warn (5개)
   - console.error → logger.error (2개)

48. ✅ `lib/test-mode.ts`
   - console.error → logger.error (2개)

49. ✅ `lib/passport-utils.ts`
   - console.warn → logger.warn (1개)
   - console.log → logger.log (1개)
   - console.error → logger.error (2개)

50. ✅ `lib/date-utils.ts`
   - console.error → logger.error (1개)

51. ✅ `lib/tts.ts`
   - console.warn → logger.warn (2개)
   - console.log → logger.log (2개)
   - console.error → logger.error (1개)

52. ✅ `lib/haptic.ts`
   - console.debug → logger.debug (1개)

53. ✅ `lib/auth.ts`
   - console.error → logger.error (1개)

54. ✅ `lib/analytics.ts`
   - console.debug → logger.debug (1개)

55. ✅ `lib/push/server.ts`
   - console.log → logger.log (3개)
   - console.error → logger.error (5개)

56. ✅ `lib/affiliate/contract-pdf.ts`
   - console.log → logger.log (5개)
   - console.warn → logger.warn (5개)
   - console.error → logger.error (1개)

57. ✅ `lib/affiliate/customer-ownership.ts`
   - console.error → logger.error (1개)

58. ✅ `lib/affiliate/admin-notifications.ts`
   - console.warn → logger.warn (1개)
   - console.log → logger.log (2개)
   - console.error → logger.error (2개)

59. ✅ `lib/affiliate/audit-log.ts`
   - console.error → logger.error (1개)

60. ✅ `lib/affiliate/contract.ts`
   - console.error → logger.error (4개)

61. ✅ `lib/affiliate/purchase-confirmation.ts`
   - console.error → logger.error (6개)
   - console.log → logger.log (1개)

62. ✅ `lib/affiliate/sales-notification.ts`
   - console.error → logger.error (2개)

63. ✅ `lib/affiliate/contract-email.ts`
   - console.log → logger.log (11개)
   - console.warn → logger.warn (1개)
   - console.error → logger.error (5개)

64. ✅ `lib/backup/affiliateDataBackup.ts`
   - console.log → logger.log (1개)
   - console.error → logger.error (3개)

65. ✅ `lib/ai/embeddingUtils.ts`
   - console.warn → logger.warn (3개)

66. ✅ `lib/notifications/scheduleAlarm.ts`
   - console.warn → logger.warn (4개)
   - console.error → logger.error (5개)
   - console.log → logger.log (5개)

67. ✅ `lib/google-drive-company-logo.ts`
   - console.error → logger.error (1개)

68. ✅ `lib/security/api-protection.ts`
   - console.log → logger.log (3개)

69. ✅ `lib/rePurchase/trigger.ts`
   - console.log → logger.log (3개)
   - console.error → logger.error (1개)

70. ✅ `lib/payapp.ts`
   - console.log → logger.log (2개)
   - console.error → logger.error (1개)

71. ✅ `lib/insights/generator.ts`
   - console.log → logger.log (16개)
   - console.error → logger.error (10개)

72. ✅ `lib/init.ts`
   - console.log → logger.log (3개)
   - console.error → logger.error (1개)

73. ✅ `lib/seo/metadata.ts`
   - console.error → logger.error (1개)

74. ✅ `lib/youtube-video-selector.ts`
   - console.error → logger.error (1개)

75. ✅ `lib/cruisedot-news-editor.ts`
   - console.warn → logger.warn (1개)

76. ✅ `lib/mall-admin-permissions.ts`
   - console.error → logger.error (2개)

77. ✅ `lib/utils/itineraryPattern.ts`
   - console.error → logger.error (1개)

78. ✅ `lib/env.ts`
   - console.error → logger.error (3개)
   - console.warn → logger.warn (2개)
   - console.log → logger.log (1개)

79. ✅ `app/api/admin/products/import/route.ts`
   - console.error → logger.error (2개)

80. ✅ `app/api/admin/marketing/customers/send-email/route.ts`
   - console.error → logger.error (3개)

81. ✅ `app/api/admin/apis/add-customer/route.ts`
   - console.error → logger.error (1개)

82. ✅ `app/api/admin/apis/active-products/route.ts`
   - console.error → logger.error (1개)

83. ✅ `app/api/admin/users/route.ts`
   - console.error → logger.error (2개)

84. ✅ `app/api/admin/insights/generate/route.ts`
   - console.error → logger.error (7개)

85. ✅ `app/api/admin/test/backup/route.ts`
   - console.log → logger.log (1개)
   - console.error → logger.error (1개)

86. ✅ `app/api/admin/test/payslip/route.ts`
   - console.error → logger.error (1개)

87. ✅ `app/api/admin/backup/trigger/route.ts`
   - console.log → logger.log (1개)
   - console.error → logger.error (1개)

88. ✅ `app/api/admin/community-bot/create-news/route.ts`
   - console.error → logger.error (1개)

89. ✅ `app/api/admin/inquiries/[inquiryId]/confirm/route.ts`
   - console.error → logger.error (3개)
   - console.warn → logger.warn (1개)

90. ✅ `app/api/admin/users/[userId]/delete/route.ts`
   - console.log → logger.log (23개)
   - console.error → logger.error (4개)

91. ✅ `app/api/admin/mall/upload/route.ts`
   - console.error → logger.error (4개)
   - console.warn → logger.warn (1개)

92. ✅ `app/api/admin/kakao/find-channel-uuid/route.ts`
   - console.error → logger.error (6개)

93. ✅ `app/api/admin/chat-bot/generate-flow/route.ts`
   - console.error → logger.error (4개)
   - console.warn → logger.warn (1개)

94. ✅ `app/api/admin/messages/send-kakao/route.ts`
   - console.error → logger.error (5개)

95. ✅ `app/api/admin/messages/send-email/route.ts`
   - console.error → logger.error (4개)

96. ✅ `app/api/admin/messages/send-sms/route.ts`
   - console.error → logger.error (7개)

97. ✅ `app/api/admin/marketing/dashboard/route.ts`
   - console.error → logger.error (9개)

98. ✅ `app/api/admin/apis/product-apis-list/route.ts`
   - console.log → logger.log (1개)
   - console.error → logger.error (2개)

99. ✅ `app/api/admin/payslips/generate/route.ts`
   - console.log → logger.log (2개)
   - console.error → logger.error (1개)

100. ✅ `app/api/admin/payslips/[id]/approve/route.ts`
   - console.log → logger.log (1개)
   - console.error → logger.error (1개)

101. ✅ `app/api/admin/mall/google-drive-products/route.ts`
   - console.log → logger.log (5개)
   - console.error → logger.error (1개)
   - console.warn → logger.warn (3개)

102. ✅ `app/api/admin/mall/google-drive-image/route.ts`
   - console.log → logger.log (1개)
   - console.error → logger.error (2개)
   - console.warn → logger.warn (1개)

103. ✅ `app/api/admin/affiliate/sales/route.ts`
   - console.error → logger.error (3개)

104. ✅ `app/api/admin/affiliate/documents/sync/route.ts`
   - console.log → logger.log (2개)
   - console.error → logger.error (1개)

105. ✅ `app/api/admin/affiliate/profiles/route.ts`
   - console.log → logger.log (8개)
   - console.error → logger.error (18개)
   - console.warn → logger.warn (1개)

106. ✅ `app/api/admin/affiliate/links/route.ts`
   - console.log → logger.log (3개)
   - console.error → logger.error (5개)

107. ✅ `app/api/admin/affiliate/sales/[saleId]/approve/route.ts`
   - console.error → logger.error (4개)

108. ✅ `app/api/admin/affiliate/sales/[saleId]/approve-commission/route.ts`
   - console.error → logger.error (1개)

109. ✅ `app/api/admin/affiliate/sales/[saleId]/reject/route.ts`
   - console.error → logger.error (3개)

110. ✅ `app/api/admin/certificate-approvals/[id]/approve/route.ts`
   - console.log → logger.log (1개)
   - console.error → logger.error (2개)

111. ✅ `app/api/admin/scheduled-messages/send/route.ts`
   - console.error → logger.error (3개)

112. ✅ `app/api/admin/scheduled-messages/[id]/route.ts`
   - console.error → logger.error (3개)

113. ✅ `app/api/admin/customer-groups/route.ts`
   - console.error → logger.error (22개)

114. ✅ `app/api/admin/affiliate/products/route.ts`
   - console.log → logger.log (5개)
   - console.error → logger.error (11개)

115. ✅ `app/api/admin/affiliate/contracts/route.ts`
   - console.error → logger.error (5개)

116. ✅ `app/api/admin/affiliate/contracts/[contractId]/approve/route.ts`
   - console.error → logger.error (5개)

117. ✅ `app/api/admin/affiliate/contracts/[contractId]/renewal/route.ts`
   - console.error → logger.error (2개)

118. ✅ `app/api/admin/affiliate/contracts/[contractId]/complete/route.ts`
   - console.error → logger.error (8개)

119. ✅ `app/api/admin/affiliate/contracts/[contractId]/terminate/route.ts`
   - console.error → logger.error (2개)

120. ✅ `app/api/admin/customer-groups/[id]/route.ts`
   - console.error → logger.error (4개)

121. ✅ `app/api/chat/route.ts`
   - console.warn → logger.warn (1개)
   - console.error → logger.error (3개)

122. ✅ `app/api/user/messages/route.ts`
   - console.error → logger.error (1개)

123. ✅ `app/api/public/products/[productCode]/route.ts`
   - console.log → logger.log (2개)
   - console.warn → logger.warn (2개)
   - console.error → logger.error (2개)

124. ✅ `app/api/admin/products/route.ts`
   - console.error → logger.error (9개)

125. ✅ `app/api/admin/system/status/route.ts`
   - console.error → logger.error (1개)

126. ✅ `app/api/admin/insights/route.ts`
   - console.error → logger.error (3개)

127. ✅ `app/api/admin/rePurchase/route.ts`
   - console.error → logger.error (2개)

128. ✅ `app/api/admin/scheduled-messages/route.ts`
   - console.error → logger.error (11개)

129. ✅ `app/api/admin/passport-request/_utils.ts`
   - console.log → logger.log (2개)
   - console.error → logger.error (2개)
   - console.warn → logger.warn (2개)

130. ✅ `app/api/admin/admin-panel-admins/route.ts`
   - console.log → logger.log (3개)
   - console.error → logger.error (6개)

131. ✅ `app/api/admin/customers/export/route.ts`
   - console.error → logger.error (2개)

132. ✅ `app/api/admin/affiliate/leads/route.ts`
   - console.error → logger.error (19개)

133. ✅ `app/api/admin/rePurchase/stats/route.ts`
   - console.error → logger.error (2개)

134. ✅ `app/api/admin/rePurchase/trigger/route.ts`
   - console.error → logger.error (7개)

135. ✅ `app/api/admin/rePurchase/[triggerId]/convert/route.ts`
   - console.error → logger.error (2개)

136. ✅ `app/api/admin/rePurchase/pattern/route.ts`
   - console.error → logger.error (2개)

137. ✅ `app/api/admin/certificate-approvals/[id]/reject/route.ts`
   - console.error → logger.error (2개)

138. ✅ `app/api/admin/affiliate/products/[productId]/route.ts`
   - console.log → logger.log (1개)
   - console.error → logger.error (2개)

139. ✅ `app/api/admin/affiliate/links/[linkId]/route.ts`
   - console.error → logger.error (3개)

140. ✅ `app/api/admin/customer-groups/[id]/members/route.ts`
   - console.error → logger.error (4개)

141. ✅ `app/api/admin/chat/route.ts`
   - console.error → logger.error (8개)
   - console.warn → logger.warn (1개)

142. ✅ `app/api/admin/pwa-stats/route.ts`
   - console.error → logger.error (5개)

143. ✅ `app/api/admin/customers/route.ts`
   - console.error → logger.error (24개)
   - console.warn → logger.warn (1개)

144. ✅ `app/api/admin/assign-trip/route.ts`
   - console.warn → logger.warn (1개)
   - console.error → logger.error (3개)

145. ✅ `app/api/admin/mall-customers/route.ts`
   - console.error → logger.error (7개)

146. ✅ `app/api/admin/mall-users/route.ts`
   - console.error → logger.error (2개)

147. ✅ `app/api/admin/test-customers/route.ts`
   - console.error → logger.error (2개)

148. ✅ `app/api/admin/affiliate/sample-data/route.ts`
   - console.error → logger.error (4개)

149. ✅ `app/api/admin/settings/automation/route.ts`
   - console.error → logger.error (4개)

150. ✅ `app/api/admin/customer-groups/[id]/customers/route.ts`
   - console.error → logger.error (2개)

151. ✅ `app/api/admin/customer-groups/[id]/funnel-settings/route.ts`
   - console.error → logger.error (2개)

152. ✅ `app/api/admin/customer-groups/[id]/message-logs/route.ts`
   - console.error → logger.error (2개)

153. ✅ `app/api/admin/customer-groups/[id]/script/route.ts`
   - console.error → logger.error (2개)

154. ✅ `app/api/admin/customer-groups/create-customer/route.ts`
   - console.error → logger.error (2개)

155. ✅ `app/api/admin/customer-groups/customers/route.ts`
   - console.error → logger.error (2개)

156. ✅ `app/api/admin/customer-groups/excel-upload/route.ts`
   - console.error → logger.error (4개)

157. ✅ `app/api/admin/users/[userId]/trips/[tripId]/onboarding/route.ts`
   - console.warn → logger.warn (2개)
   - console.error → logger.error (3개)

158. ✅ `app/api/admin/certificate-approvals/route.ts`
   - console.error → logger.error (1개)

159. ✅ `app/api/admin/passport-request/send/route.ts`
   - console.error → logger.error (6개)

160. ✅ `app/api/admin/passport-request/manual/route.ts`
   - console.error → logger.error (3개)

161. ✅ `app/api/admin/affiliate/settlements/route.ts`
   - console.error → logger.error (2개)

162. ✅ `app/api/admin/affiliate/sample-data/auto-generate/route.ts`
   - console.error → logger.error (3개)

163. ✅ `app/api/admin/marketing/customers/excel-upload/route.ts`
   - console.error → logger.error (2개)

164. ✅ `app/api/admin/affiliate/payment-pages/upload/route.ts`
   - console.error → logger.error (2개)

165. ✅ `app/api/admin/customers/[userId]/passport/route.ts`
   - console.error → logger.error (6개)

166. ✅ `app/api/admin/payslips/[id]/pdf/route.ts`
   - console.error → logger.error (1개)

167. ✅ `app/api/admin/customers/[userId]/notes/route.ts`
   - console.error → logger.error (4개)

168. ✅ `app/api/admin/customers/[userId]/notes/[noteId]/route.ts`
   - console.error → logger.error (3개)

169. ✅ `app/api/admin/customers/[userId]/purchase-info/route.ts`
   - console.error → logger.error (2개)

170. ✅ `app/api/admin/marketing/customers/by-group/route.ts`
   - console.error → logger.error (2개)

171. ✅ `app/api/admin/marketing/customers/send-team-dashboard/route.ts`
   - console.error → logger.error (3개)

172. ✅ `app/api/admin/apis/customer-detail/route.ts`
   - console.error → logger.error (1개)

173. ✅ `app/api/admin/apis/update-customer/route.ts`
   - console.error → logger.error (1개)

174. ✅ `app/api/admin/apis/product-customers/route.ts`
   - console.error → logger.error (1개)

175. ✅ `app/api/admin/apis/excel/route.ts`
   - console.error → logger.error (1개)

176. ✅ `app/api/admin/refund-policy-groups/route.ts`
   - console.error → logger.error (2개)

177. ✅ `app/api/admin/mall/community/posts/[id]/route.ts`
   - console.error → logger.error (2개)

178. ✅ `app/api/admin/users/[userId]/sessions/route.ts`
   - console.error → logger.error (1개)

179. ✅ `app/api/admin/users/[userId]/sessions/[sessionId]/route.ts`
   - console.error → logger.error (1개)

180. ✅ `app/api/admin/users/[userId]/lock/route.ts`
   - console.error → logger.error (2개)

181. ✅ `app/api/admin/users/[userId]/reset-password/route.ts`
   - console.error → logger.error (1개)

182. ✅ `app/api/admin/users/[userId]/approve-genie/route.ts`
   - console.error → logger.error (1개)

183. ✅ `app/api/admin/users/[userId]/inquiries/route.ts`
   - console.error → logger.error (1개)

184. ✅ `app/api/admin/users/[userId]/comments/route.ts`
   - console.error → logger.error (1개)

185. ✅ `app/api/admin/users/[userId]/product-views/route.ts`
   - console.error → logger.error (1개)

186. ✅ `app/api/admin/users/[userId]/analytics/route.ts`
   - console.error → logger.error (2개)

187. ✅ `app/api/admin/users/[userId]/analytics/export/route.ts`
   - console.error → logger.error (2개)

188. ✅ `app/api/admin/users/[userId]/chat-history/route.ts`
   - console.error → logger.error (1개)

189. ✅ `app/api/admin/users/[userId]/trips/[tripId]/route.ts`
   - console.error → logger.error (3개)

190. ✅ `app/api/admin/users/[userId]/reviews/route.ts`
   - console.error → logger.error (1개)

191. ✅ `app/api/admin/users/[userId]/posts/route.ts`
   - console.error → logger.error (1개)

192. ✅ `app/api/admin/users/[userId]/travel-records/route.ts`
   - console.error → logger.error (2개)

---

## 📝 작업 규칙

### 변경 규칙
- `console.log()` → `logger.log()`
- `console.error()` → `logger.error()`
- `console.warn()` → `logger.warn()`
- `console.info()` → `logger.info()`
- `console.debug()` → `logger.debug()`

### Import 추가
각 파일 상단에 다음 import 추가:
```typescript
import { logger } from '@/lib/logger';
```

---

## 🎯 우선순위

### 1순위 (진행 중)
- ✅ Admin API 파일들
- ⏳ 주요 API 파일들 (auth, payment 등)

### 2순위 (대기)
- lib 폴더
- components 폴더
- 기타 API 파일들

### 3순위 (대기)
- app 폴더 (페이지 파일)
- 기타 폴더

---

## 📌 다음 작업 예정

1. 주요 API 파일들 계속 처리
   - `app/api/auth/login/route.ts` (46개 console 사용)
   - `app/api/payment/*` 파일들
   - 기타 중요한 API 파일들

2. lib 폴더 정리
   - `lib/session.ts`
   - 기타 유틸리티 파일들

3. components 및 기타 폴더

---

## 💡 참고 사항

- `logger`는 개발 환경에서만 로그를 출력합니다 (프로덕션에서는 숨김)
- 에러는 항상 출력되므로 `logger.error()` 사용
- 보안 로거는 별도로 존재: `securityLogger`, `authLogger`

---

**작성자**: AI Assistant  
**최종 업데이트**: 2025년 1월 28일

