import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/detection_state.dart';
import '../providers/detection_provider.dart';
import 'active_call_screen.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  int _currentNavIndex = 1; // Default to Contacts
  final TextEditingController _dialController = TextEditingController();

  final List<Map<String, dynamic>> _contacts = [
    {
      'name': 'Officer Priya (Human)',
      'status': 'online',
      'isSpoof': false,
      'subtitle': 'Verified Human Audio Peer (MSE ~12.4)',
    },
    {
      'name': 'Bank Security Dept (AI Spoof Test)',
      'status': 'online',
      'isSpoof': true,
      'subtitle': 'Simulated Deepfake Voice (MSE ~42.8)',
    },
    {
      'name': 'Aditi Sharma',
      'status': 'online',
      'isSpoof': false,
      'subtitle': 'Colleague • 16kHz VoIP',
    },
    {
      'name': 'FedEx Parcel Scam (AI Spoof Test)',
      'status': 'online',
      'isSpoof': true,
      'subtitle': 'Simulated Phishing Script + Voice Clone',
    },
    {
      'name': 'Rohit Kumar',
      'status': 'offline',
      'isSpoof': false,
      'subtitle': 'Offline • Last seen 1 hr ago',
    },
  ];

  void _startCall(String name, {bool isSpoof = false}) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ActiveCallScreen(
          peerUsername: name,
          isSimulatedSpoof: isSpoof,
          onEndCall: () => Navigator.of(context).pop(),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final detectionState = ref.watch(detectionNotifierProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF121316),
      appBar: AppBar(
        backgroundColor: const Color(0xFF181A1D),
        elevation: 0,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: const Color(0xFF5865F2),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.shield, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Swaraksha VoIP',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                ),
                Row(
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: const BoxDecoration(
                        color: Color(0xFF23A55A),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 4),
                    const Text(
                      'BARA AI Guard Active • On-Device',
                      style: TextStyle(fontSize: 10, color: Color(0xFF23A55A)),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.info_outline, color: Color(0xFF949BA4)),
            tooltip: 'App Info',
            onPressed: () {
              showAboutDialog(
                context: context,
                applicationName: 'Swaraksha VoIP Guard',
                applicationVersion: '1.0.0 (Native Android Flutter)',
                applicationLegalese: 'Protected with on-device Convolutional Autoencoder (BARA) & Edge STT Intent Analysis.',
              );
            },
          ),
          const SizedBox(width: 6),
        ],
      ),
      body: _buildCurrentTab(detectionState),
      bottomNavigationBar: NavigationBar(
        backgroundColor: const Color(0xFF181A1D),
        indicatorColor: const Color(0xFF3A3E48),
        selectedIndex: _currentNavIndex,
        onDestinationSelected: (idx) => setState(() => _currentNavIndex = idx),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.history, color: Color(0xFF949BA4)),
            selectedIcon: Icon(Icons.history, color: Color(0xFF7289DA)),
            label: 'Recents',
          ),
          NavigationDestination(
            icon: Icon(Icons.people_outline, color: Color(0xFF949BA4)),
            selectedIcon: Icon(Icons.people, color: Color(0xFF7289DA)),
            label: 'Contacts',
          ),
          NavigationDestination(
            icon: Icon(Icons.dialpad, color: Color(0xFF949BA4)),
            selectedIcon: Icon(Icons.dialpad, color: Color(0xFF7289DA)),
            label: 'Keypad',
          ),
          NavigationDestination(
            icon: Icon(Icons.security, color: Color(0xFF949BA4)),
            selectedIcon: Icon(Icons.security, color: Color(0xFF7289DA)),
            label: 'BARA Guard',
          ),
        ],
      ),
    );
  }

  Widget _buildCurrentTab(DetectionState detectionState) {
    switch (_currentNavIndex) {
      case 0: // Recents / Call History
        return _buildRecentsTab();

      case 1: // Contacts
        return _buildContactsTab();

      case 2: // Keypad
        return _buildKeypadTab();

      case 3: // BARA Guard & Edge STT Settings
        return _buildSecurityDashboardTab(detectionState);

      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildRecentsTab() {
    final history = ref.watch(callHistoryProvider);

    if (history.isEmpty) {
      return const Center(
        child: Text(
          'No call history yet.\nMake a call from Contacts to begin.',
          textAlign: TextAlign.center,
          style: TextStyle(color: Color(0xFF949BA4), fontSize: 13),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: history.length,
      itemBuilder: (context, idx) {
        final item = history[idx];
        final isSpoof = item.verdict == DetectionVerdict.fake;

        return Card(
          color: const Color(0xFF1E2025),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(
              color: isSpoof
                  ? const Color(0xFFED4245).withOpacity(0.5)
                  : const Color(0xFF2B2D31),
            ),
          ),
          margin: const EdgeInsets.only(bottom: 10),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: isSpoof
                          ? const Color(0xFFED4245).withOpacity(0.2)
                          : const Color(0xFF23A55A).withOpacity(0.2),
                      child: Icon(
                        isSpoof ? Icons.warning_amber_rounded : Icons.call_received,
                        color: isSpoof ? const Color(0xFFED4245) : const Color(0xFF23A55A),
                        size: 20,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item.callerName,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            '${_formatDuration(item.duration)} • Peak MSE ${item.peakMse.toStringAsFixed(1)}',
                            style: const TextStyle(color: Color(0xFF949BA4), fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: isSpoof ? const Color(0xFFED4245) : const Color(0xFF23A55A),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        isSpoof ? 'AI VOICE SPOOF' : 'VERIFIED HUMAN',
                        style: const TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
                if (item.transcript.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF141619),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'Last transcript: "${item.transcript.last.text}"',
                      style: const TextStyle(color: Color(0xFF949BA4), fontSize: 11, fontStyle: FontStyle.italic),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildContactsTab() {
    return ListView(
      padding: const EdgeInsets.all(12),
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          margin: const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: const Color(0xFF1E2025),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFF2B2D31)),
          ),
          child: Row(
            children: const [
              Icon(Icons.shield_outlined, color: Color(0xFF5865F2), size: 24),
              SizedBox(width: 10),
              Expanded(
                child: Text(
                  'Tap any contact to start an encrypted VoIP call protected by on-device BARA AI.',
                  style: TextStyle(color: Color(0xFF949BA4), fontSize: 11),
                ),
              ),
            ],
          ),
        ),
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 4, vertical: 6),
          child: Text(
            'AVAILABLE CONTACTS & TEST CHANNELS',
            style: TextStyle(
              color: Color(0xFF949BA4),
              fontSize: 11,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.0,
            ),
          ),
        ),
        ..._contacts.map((c) {
          final isOnline = c['status'] == 'online';
          final isSpoof = c['isSpoof'] == true;

          return Card(
            color: const Color(0xFF1E2025),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: BorderSide(
                color: isSpoof
                    ? const Color(0xFFED4245).withOpacity(0.3)
                    : const Color(0xFF2B2D31),
              ),
            ),
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: isSpoof ? const Color(0xFF3B1E22) : const Color(0xFF2B2D31),
                child: Text(
                  c['name'][0],
                  style: TextStyle(
                    color: isSpoof ? const Color(0xFFED4245) : Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              title: Text(
                c['name'],
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
              subtitle: Text(
                c['subtitle'],
                style: TextStyle(
                  color: isSpoof ? const Color(0xFFED4245).withOpacity(0.9) : const Color(0xFF949BA4),
                  fontSize: 11,
                ),
              ),
              trailing: ElevatedButton.icon(
                onPressed: isOnline ? () => _startCall(c['name'], isSpoof: isSpoof) : null,
                icon: const Icon(Icons.call, size: 14),
                label: const Text('Call', style: TextStyle(fontSize: 12)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: isSpoof ? const Color(0xFFED4245) : const Color(0xFF23A55A),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
              ),
            ),
          );
        }),
      ],
    );
  }

  Widget _buildKeypadTab() {
    return Column(
      children: [
        const Spacer(),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          alignment: Alignment.center,
          child: Text(
            _dialController.text.isEmpty ? 'Enter number' : _dialController.text,
            style: TextStyle(
              color: _dialController.text.isEmpty ? const Color(0xFF949BA4) : Colors.white,
              fontSize: 32,
              fontWeight: FontWeight.bold,
              letterSpacing: 2,
            ),
          ),
        ),
        const SizedBox(height: 24),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 48),
          child: GridView.count(
            shrinkWrap: true,
            crossAxisCount: 3,
            mainAxisSpacing: 16,
            crossAxisSpacing: 16,
            children: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']
                .map((digit) => InkWell(
                      onTap: () {
                        setState(() => _dialController.text += digit);
                      },
                      borderRadius: BorderRadius.circular(36),
                      child: Container(
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: const Color(0xFF1E2025),
                          border: Border.all(color: const Color(0xFF2B2D31)),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          digit,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ))
                .toList(),
          ),
        ),
        const SizedBox(height: 24),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const SizedBox(width: 48),
            IconButton(
              iconSize: 64,
              icon: const CircleAvatar(
                radius: 32,
                backgroundColor: Color(0xFF23A55A),
                child: Icon(Icons.call, color: Colors.white, size: 30),
              ),
              onPressed: () {
                if (_dialController.text.isNotEmpty) {
                  _startCall(_dialController.text);
                }
              },
            ),
            if (_dialController.text.isNotEmpty)
              IconButton(
                icon: const Icon(Icons.backspace_outlined, color: Color(0xFF949BA4)),
                onPressed: () {
                  setState(() {
                    if (_dialController.text.isNotEmpty) {
                      _dialController.text = _dialController.text.substring(0, _dialController.text.length - 1);
                    }
                  });
                },
              )
            else
              const SizedBox(width: 48),
          ],
        ),
        const Spacer(),
      ],
    );
  }

  Widget _buildSecurityDashboardTab(DetectionState detectionState) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // BARA Guard Main Banner
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF1E2025),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFF2B2D31)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: const [
                  Icon(Icons.verified_user, color: Color(0xFF23A55A), size: 28),
                  SizedBox(width: 10),
                  Text(
                    'BARA AI Guard Armed',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              const Text(
                'Convolutional Autoencoder (CAE) checks every incoming VoIP audio frame against 16kHz Gammatone acoustic anomalies with 0 cloud latency.',
                style: TextStyle(color: Color(0xFF949BA4), fontSize: 12, height: 1.4),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // Sensitivity Threshold Slider
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF1E2025),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFF2B2D31)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'RECONSTRUCTION MSE THRESHOLD',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.8,
                      color: Color(0xFF949BA4),
                    ),
                  ),
                  Text(
                    detectionState.threshold.toStringAsFixed(1),
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF5865F2),
                    ),
                  ),
                ],
              ),
              Slider(
                value: detectionState.threshold,
                min: 20.0,
                max: 50.0,
                divisions: 30,
                activeColor: const Color(0xFF5865F2),
                inactiveColor: const Color(0xFF2B2D31),
                onChanged: (val) {
                  ref.read(detectionNotifierProvider.notifier).setThreshold(val);
                },
              ),
              const Text(
                'Default: 32.0 (97th percentile reconstruction error cutoff on trained clean human speech). Lower values increase sensitivity.',
                style: TextStyle(color: Color(0xFF949BA4), fontSize: 11),
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // In-Device STT Toggle
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF1E2025),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFF2B2D31)),
          ),
          child: Row(
            children: [
              const Icon(Icons.record_voice_over, color: Color(0xFF23A55A)),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: const [
                    Text(
                      'Edge Speech-to-Text Intent Engine',
                      style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                    ),
                    SizedBox(height: 2),
                    Text(
                      'Analyzes speech on device for high-risk social engineering phrases & scam triggers.',
                      style: TextStyle(color: Color(0xFF949BA4), fontSize: 11),
                    ),
                  ],
                ),
              ),
              Switch(
                value: detectionState.isSttActive,
                activeColor: const Color(0xFF23A55A),
                onChanged: (_) {
                  ref.read(detectionNotifierProvider.notifier).toggleStt();
                },
              ),
            ],
          ),
        ),

        const SizedBox(height: 16),

        // System Pipeline Specs
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF141619),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF2B2D31)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: const [
              Text(
                'On-Device System Configuration',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              SizedBox(height: 8),
              Text(
                '• Audio Sampling: 16,000 Hz Mono PCM\n'
                '• Filterbank: 64-Channel Gammatone Cochlear Matrix\n'
                '• Chunk Dimensions: [1, 64, 400, 1] (4.0s frames)\n'
                '• Neural Model: bara_denoising_cae.tflite (On-Device Inference)\n'
                '• Decision Window: 10 Chunks with 20% Fake Ratio Hysteresis\n'
                '• Android Compatibility: Android 10 (API 29) to Android 15 (API 35)',
                style: TextStyle(fontSize: 11, color: Color(0xFF949BA4), height: 1.5),
              ),
            ],
          ),
        ),
      ],
    );
  }

  String _formatDuration(Duration d) {
    final m = d.inMinutes;
    final s = d.inSeconds % 60;
    return '${m}m ${s}s';
  }
}
