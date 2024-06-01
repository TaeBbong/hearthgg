import 'package:flutter/material.dart';
import 'package:get/get.dart';

import '../controllers/home_controller.dart';
import '../models/rankdata.dart';
import '../constants/area.dart';
import '../services/main_service.dart';
import '../widgets/loading_indicator.dart';
import '../widgets/rank_card.dart';
import '../widgets/footer.dart';

class MobileScreen extends GetView<HomeController> {
  MobileScreen({super.key});

  final mainService = Get.find<MainService>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Hearth.gg'),
        actions: [
          Switch(
            value: mainService.isDarkMode,
            onChanged: mainService.changeMode,
            activeColor: Colors.blue,
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Row(
                      children: [
                        Expanded(
                          child: DropdownButtonHideUnderline(
                            child: DropdownButtonFormField<AreaLabel>(
                              value: controller.searchParams['area'],
                              items: AreaLabel.values
                                  .map<DropdownMenuItem<AreaLabel>>(
                                      (AreaLabel value) {
                                return DropdownMenuItem<AreaLabel>(
                                  value: value,
                                  child: Text(
                                    value.text,
                                    style: const TextStyle(fontSize: 12),
                                  ),
                                );
                              }).toList(),
                              onChanged: (area) => controller.updateArea(area!),
                              itemHeight: 50,
                              isExpanded: true,
                              decoration: const InputDecoration(
                                enabledBorder: OutlineInputBorder(
                                  borderSide:
                                      BorderSide(color: Colors.grey, width: 1),
                                ),
                                border: OutlineInputBorder(),
                                filled: false,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 1),
                        Expanded(
                          flex: 3,
                          child: TextFormField(
                            controller: controller.battleTagController,
                            onFieldSubmitted: (_) async =>
                                await controller.performSearch(),
                            decoration: InputDecoration(
                              hintText: '배틀태그를 입력하세요. (ex: Flurry)',
                              hintStyle: const TextStyle(
                                  fontSize: 12, fontWeight: FontWeight.bold),
                              border: const OutlineInputBorder(),
                              suffixIcon: IconButton(
                                icon: const Icon(Icons.search),
                                onPressed: () async =>
                                    await controller.performSearch(),
                              ),
                              contentPadding:
                                  const EdgeInsets.fromLTRB(15, 22, 10, 22),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  GetBuilder<HomeController>(
                    builder: (controller) {
                      return controller.isSearching
                          ? const LoadingIndicator()
                          : controller.isResult
                              ? SizedBox(
                                  width:
                                      MediaQuery.of(context).size.width * 0.8,
                                  child: RankCard(
                                      rankData: RankData.fromJson(
                                          controller.searchResult)),
                                )
                              : Container();
                    },
                  ),
                ],
              ),
            ),
          ),
          Footer(),
        ],
      ),
    );
  }
}
