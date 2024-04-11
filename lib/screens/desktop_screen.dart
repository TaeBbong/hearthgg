import 'package:flutter/material.dart';

class DesktopScreen extends StatefulWidget {
  final bool isDarkMode;
  final Function(bool) toggleTheme;

  const DesktopScreen(
      {super.key, required this.isDarkMode, required this.toggleTheme});

  @override
  _DesktopScreenState createState() => _DesktopScreenState();
}

class _DesktopScreenState extends State<DesktopScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('HearthGG.web.app'),
        actions: [
          Switch(
            value: widget.isDarkMode,
            onChanged: widget.toggleTheme,
            activeColor: Colors.blue,
          ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Image.asset('images/main.png', width: 240),
          ),
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: TextFormField(
              decoration: InputDecoration(
                labelText: 'Search',
                border: OutlineInputBorder(),
                suffixIcon: Icon(Icons.search),
              ),
            ),
          ),
          Expanded(
              child: Container()), // Use expanded to push footer to the bottom
          Footer(),
        ],
      ),
    );
  }
}

class Footer extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(20),
      color: Theme.of(context)
          .primaryColor
          .withOpacity(0.1), // Slight primary color tint
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            '© 2024 My Website',
            style: TextStyle(
              fontSize: 16,
              color:
                  Theme.of(context).primaryColor, // Use primary color for text
            ),
          ),
        ],
      ),
    );
  }
}
